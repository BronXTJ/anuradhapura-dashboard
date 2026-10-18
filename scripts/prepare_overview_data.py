"""Build Anuradhapura web data for the overview map.

Reads the datasets folder next to this repo and writes public/data.
Building extracts are written under public/data/buildings and are gitignored.
"""

from __future__ import annotations

import json
import os
import sys
from io import BytesIO
from pathlib import Path

import geopandas as gpd
import openpyxl
import pyogrio

ROOT = Path(__file__).resolve().parents[1]
DATASETS = Path(os.environ.get("DATASETS_DIR", ROOT.parent / "datasets"))
OUT = ROOT / "public" / "data"
BUILDINGS_OUT = OUT / "buildings"
DISTRICT_PCODE = "LK71"
SOURCE_BUILDINGS = 410974
DISTRICT_POPULATION = 960080


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def read_layer(path: Path, columns: list[str], where: str | None = None) -> gpd.GeoDataFrame:
    kwargs = {"engine": "pyogrio", "columns": columns}
    if where:
        try:
            frame = gpd.read_file(path, where=where, **kwargs)
            print(f"read {path.name} where {where}: {len(frame)}")
            return frame
        except Exception as error:
            print(f"where failed for {path.name} ({error}); filtering after read")
    frame = gpd.read_file(path, **kwargs)
    if where and "adm2_pcode" in frame.columns:
        frame = frame[frame["adm2_pcode"] == DISTRICT_PCODE].copy()
    print(f"read {path.name}: {len(frame)}")
    return frame


def write_geojson(frame: gpd.GeoDataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        pyogrio.write_dataframe(
            frame,
            path,
            driver="GeoJSON",
            layer_options={"COORDINATE_PRECISION": "6"},
        )
    except Exception:
        pyogrio.write_dataframe(frame, path, driver="GeoJSON")


def sheet_rows(workbook: openpyxl.Workbook, name: str) -> list[dict]:
    worksheet = workbook[name]
    iterator = worksheet.iter_rows(values_only=True)
    header = ["" if cell is None else str(cell) for cell in next(iterator)]
    rows = []
    for raw in iterator:
        if raw[0] is None:
            continue
        rows.append(dict(zip(header, raw)))
    return rows


def as_int(value: object) -> int:
    return int(round(float(value)))


def as_float(value: object) -> float:
    return round(float(value), 5)


def density(count: int, area: float) -> float | None:
    if area == 0:
        return None
    return round(count / area, 2)


def load_census() -> tuple[list[dict], list[dict]]:
    path = DATASETS / "population_data" / "anuradhapura_gn + dsd population data 2024 ( latest)"
    if not path.is_file():
        fail(f"Missing 2024 census workbook: {path}")
    workbook = openpyxl.load_workbook(BytesIO(path.read_bytes()), read_only=True, data_only=True)
    gn_rows = sheet_rows(workbook, "GN_divisions_2024")
    ds_rows = sheet_rows(workbook, "DS_divisions_2024")
    workbook.close()
    return ds_rows, gn_rows


def slim_admin(frame: gpd.GeoDataFrame, name_field: str, code_field: str, extra: list[str]) -> gpd.GeoDataFrame:
    keep = [name_field, code_field, "area_sqkm", "center_lat", "center_lon", *extra, "geometry"]
    out = frame[keep].copy()
    out = out.rename(columns={name_field: "name", code_field: "pcode"})
    if "adm3_name" in out.columns:
        out = out.rename(columns={"adm3_name": "parent_name", "adm3_pcode": "parent_pcode"})
    out["area_sqkm"] = out["area_sqkm"].map(as_float)
    out["center_lat"] = out["center_lat"].map(as_float)
    out["center_lon"] = out["center_lon"].map(as_float)
    return out


def build_stats(ds: gpd.GeoDataFrame, gn: gpd.GeoDataFrame, ds_rows: list[dict], gn_rows: list[dict]) -> dict:
    ds_by_code = {row["DS P-code (HDX/Survey Dept)"]: row for row in ds_rows}
    gn_by_code = {row["GN P-code (HDX)"]: row for row in gn_rows}
    boundary_ds = set(ds["pcode"])
    boundary_gn = set(gn["pcode"])
    missing_ds = sorted(boundary_ds - set(ds_by_code))
    extra_ds = sorted(set(ds_by_code) - boundary_ds)
    missing_gn = sorted(boundary_gn - set(gn_by_code))
    extra_gn = sorted(set(gn_by_code) - boundary_gn)
    if missing_ds or extra_ds or missing_gn or extra_gn:
        fail(
            "Census and boundary codes do not match. "
            f"DS missing {missing_ds} extra {extra_ds}. "
            f"GN missing {len(missing_gn)} extra {len(extra_gn)}."
        )

    ds_stats = []
    for row in ds.itertuples(index=False):
        census = ds_by_code[row.pcode]
        population = as_int(census["Population 2024"])
        housing = as_int(census["Housing units 2024"])
        area = float(row.area_sqkm)
        ds_stats.append(
            {
                "name": row.name,
                "pcode": row.pcode,
                "parent_name": "Anuradhapura",
                "parent_pcode": DISTRICT_PCODE,
                "area_sqkm": area,
                "population": population,
                "housing": housing,
                "population_density": density(population, area),
                "housing_density": density(housing, area),
            }
        )

    gn_stats = []
    for row in gn.itertuples(index=False):
        census = gn_by_code[row.pcode]
        population = as_int(census["Population 2024 (provisional)"])
        housing = as_int(census["Occupied housing units 2024 (provisional)"])
        area = float(row.area_sqkm)
        gn_stats.append(
            {
                "name": row.name,
                "pcode": row.pcode,
                "parent_name": row.parent_name,
                "parent_pcode": row.parent_pcode,
                "area_sqkm": area,
                "population": population,
                "housing": housing,
                "population_density": density(population, area),
                "housing_density": density(housing, area),
            }
        )

    return {
        "ds_stats": ds_stats,
        "gn_stats": gn_stats,
        "district_population": sum(item["population"] for item in ds_stats),
        "district_housing": sum(item["housing"] for item in ds_stats),
    }


def split_buildings(ds: gpd.GeoDataFrame) -> dict:
    path = DATASETS / "buildings_GEE" / "Anuradhapura_Buildings.shp"
    buildings = gpd.read_file(path, engine="pyogrio", columns=["area_in_me"])
    print(f"read buildings: {len(buildings)}")
    if buildings.crs is None:
        buildings = buildings.set_crs(4326)
    else:
        buildings = buildings.to_crs(4326)

    projected = buildings.to_crs(32644)
    projected_ds = ds.to_crs(32644)
    points = gpd.GeoDataFrame(
        {"area_in_me": buildings["area_in_me"]},
        geometry=projected.geometry.centroid.to_crs(4326),
        crs=4326,
    )
    joined = gpd.sjoin(points, ds[["pcode", "geometry"]], how="left", predicate="intersects")
    shared = int(joined.index.duplicated().sum())
    joined = joined[~joined.index.duplicated(keep="first")]
    codes = joined["pcode"].copy()
    missing = codes[codes.isna()].index
    nearest_count = 0
    if len(missing):
        nearest = gpd.sjoin_nearest(
            projected.loc[missing, ["geometry"]],
            projected_ds[["pcode", "geometry"]],
            how="left",
        )
        nearest = nearest[~nearest.index.duplicated(keep="first")]
        codes.loc[nearest.index] = nearest["pcode"].to_numpy()
        nearest_count = int(codes.loc[missing].notna().sum())
        print(f"buildings assigned to the nearest DS division: {nearest_count}")

    still_missing = codes[codes.isna()]
    if len(still_missing):
        leftover = buildings.loc[still_missing.index, ["area_in_me", "geometry"]]
        BUILDINGS_OUT.mkdir(parents=True, exist_ok=True)
        write_geojson(leftover, BUILDINGS_OUT / "_unassigned.geojson")
        print(f"unassigned buildings: {len(still_missing)}")

    assigned_codes = codes[codes.notna()]
    BUILDINGS_OUT.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    for pcode, index in assigned_codes.groupby(assigned_codes).groups.items():
        part = buildings.loc[index, ["area_in_me", "geometry"]].copy()
        write_geojson(part, BUILDINGS_OUT / f"{pcode}.geojson")
        counts[str(pcode)] = len(part)
        print(f"buildings {pcode}: {len(part)}")

    stale = BUILDINGS_OUT / "_unassigned.geojson"
    if stale.exists() and len(still_missing) == 0:
        stale.unlink()

    return {
        "by_ds": counts,
        "assigned": int(sum(counts.values())),
        "assigned_by_nearest": nearest_count,
        "unassigned": int(len(still_missing)),
        "shared_boundary": shared,
        "source": int(len(buildings)),
    }


def main() -> None:
    if not DATASETS.is_dir():
        fail(f"Datasets folder not found: {DATASETS}")
    OUT.mkdir(parents=True, exist_ok=True)

    district = read_layer(
        DATASETS / "district_boundaryA" / "anuradhapura_dstrct.shp",
        ["adm2_name", "adm2_pcode", "area_sqkm", "center_lat", "center_lon"],
    )
    district = district.to_crs(4326)
    district = slim_admin(district, "adm2_name", "adm2_pcode", [])
    if len(district) != 1 or district.iloc[0]["pcode"] != DISTRICT_PCODE:
        fail("District boundary is not the single Anuradhapura polygon LK71.")
    write_geojson(district, OUT / "district.geojson")

    ds = read_layer(
        DATASETS / "lka_admin_boundaries.geojson" / "lka_admin3.geojson",
        ["adm3_name", "adm3_pcode", "adm2_pcode", "area_sqkm", "center_lat", "center_lon"],
        where=f"adm2_pcode = '{DISTRICT_PCODE}'",
    )
    ds = slim_admin(ds, "adm3_name", "adm3_pcode", [])
    ds = ds.sort_values("name").reset_index(drop=True)
    if len(ds) != 22:
        fail(f"Expected 22 DS divisions, found {len(ds)}.")
    write_geojson(ds, OUT / "ds.geojson")

    gn = read_layer(
        DATASETS / "lka_admin_boundaries.geojson" / "lka_admin4.geojson",
        ["adm4_name", "adm4_pcode", "adm3_name", "adm3_pcode", "adm2_pcode", "area_sqkm", "center_lat", "center_lon"],
        where=f"adm2_pcode = '{DISTRICT_PCODE}'",
    )
    gn = slim_admin(gn, "adm4_name", "adm4_pcode", ["adm3_name", "adm3_pcode"])
    gn = gn.sort_values(["parent_name", "name"]).reset_index(drop=True)
    if len(gn) != 694:
        fail(f"Expected 694 GN divisions, found {len(gn)}.")
    write_geojson(gn, OUT / "gn.geojson")

    ds_rows, gn_rows = load_census()
    stats_parts = build_stats(ds, gn, ds_rows, gn_rows)
    if stats_parts["district_population"] != DISTRICT_POPULATION:
        fail(
            "District population is "
            f"{stats_parts['district_population']}, expected {DISTRICT_POPULATION}."
        )
    district_row = district.iloc[0]
    district_area = float(district_row["area_sqkm"])
    stats = {
        "district": {
            "name": district_row["name"],
            "pcode": DISTRICT_PCODE,
            "area_sqkm": district_area,
            "population": stats_parts["district_population"],
            "housing": stats_parts["district_housing"],
            "population_density": density(stats_parts["district_population"], district_area),
            "housing_density": density(stats_parts["district_housing"], district_area),
        },
        "ds": stats_parts["ds_stats"],
        "gn": stats_parts["gn_stats"],
    }
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")

    roads = read_layer(
        DATASETS / "hotosm_lka_roads_osm_shp" / "roads_lines.shp",
        ["highway", "name", "adm2_pcode"],
        where=f"adm2_pcode = '{DISTRICT_PCODE}'",
    )
    if roads.empty or set(roads["adm2_pcode"].dropna().unique()) != {DISTRICT_PCODE}:
        fail("Road extract is not limited to LK71.")
    roads = roads.drop(columns=["adm2_pcode"])
    write_geojson(roads, OUT / "roads.geojson")

    pois = read_layer(
        DATASETS / "hotosm_lka_points_of_interest_osm_geojson" / "points_of_interest.geojson",
        ["name", "amenity", "shop", "tourism", "adm2_pcode"],
        where=f"adm2_pcode = '{DISTRICT_PCODE}'",
    )
    if pois.empty or set(pois["adm2_pcode"].dropna().unique()) != {DISTRICT_PCODE}:
        fail("POI extract is not limited to LK71.")
    pois = pois.drop(columns=["adm2_pcode"])
    write_geojson(pois, OUT / "pois.geojson")

    buildings = split_buildings(ds)
    if buildings["source"] != SOURCE_BUILDINGS:
        fail(f"Building source count is {buildings['source']}, expected {SOURCE_BUILDINGS}.")
    if buildings["assigned"] + buildings["unassigned"] != buildings["source"]:
        fail("Assigned and unassigned buildings do not add up to the source count.")

    manifest = {
        "district": len(district),
        "ds": len(ds),
        "gn": len(gn),
        "roads": len(roads),
        "pois": len(pois),
        "district_population": DISTRICT_POPULATION,
        "buildings_source": buildings["source"],
        "buildings_assigned": buildings["assigned"],
        "buildings_assigned_by_nearest": buildings["assigned_by_nearest"],
        "buildings_unassigned": buildings["unassigned"],
        "buildings_on_shared_boundary": buildings["shared_boundary"],
        "buildings_by_ds": buildings["by_ds"],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({key: manifest[key] for key in manifest if key != "buildings_by_ds"}, indent=2))

    if buildings["unassigned"]:
        print(
            f"{buildings['unassigned']} buildings have centroids outside every DS division. "
            "They were written to public/data/buildings/_unassigned.geojson and were not dropped.",
            file=sys.stderr,
        )
        raise SystemExit(2)


if __name__ == "__main__":
    main()
