import { useEffect, useId, useMemo, useState } from 'react'
import { divisionLabel, loadDivisions, type Division, type DivisionMode } from '../divisions.ts'

type DivisionSearchProps = {
  mode: DivisionMode
  query: string
  onQueryChange: (value: string) => void
  onSelect: (division: Division) => void
}

export function DivisionSearch({ mode, query, onQueryChange, onSelect }: DivisionSearchProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [divisions, setDivisions] = useState<Division[]>([])

  useEffect(() => {
    let cancelled = false
    void loadDivisions()
      .then((catalog) => {
        if (!cancelled) setDivisions(catalog[mode])
      })
      .catch((error: unknown) => {
        console.error(error)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return divisions
    return divisions.filter((division) => {
      const label = divisionLabel(division).toLowerCase()
      return (
        division.name.toLowerCase().includes(needle) ||
        division.parentName.toLowerCase().includes(needle) ||
        division.pcode.toLowerCase().includes(needle) ||
        label.includes(needle)
      )
    })
  }, [divisions, query])

  const active = options[Math.min(activeIndex, Math.max(options.length - 1, 0))]

  function choose(division: Division) {
    onSelect(division)
    setOpen(false)
  }

  return (
    <div className="search">
      <label className="search-label" htmlFor={`${listId}-input`}>
        Search divisions
      </label>
      <div className="search-field">
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          className="search-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active ? `${listId}-${active.pcode}` : undefined}
          placeholder={mode === 'ds' ? 'Search a DS division' : 'Search a GN division'}
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onMouseDown={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter' && open && active) {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange('')
              setActiveIndex(0)
              setOpen(true)
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="search-panel">
          <ul id={listId} className="search-list" role="listbox" aria-label="Division names">
            {options.length === 0 ? (
              <li className="search-empty">{divisions.length === 0 ? 'Loading divisions' : 'No matches'}</li>
            ) : (
              options.map((division, index) => (
                <li key={division.pcode}>
                  <button
                    type="button"
                    id={`${listId}-${division.pcode}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? 'search-option is-active' : 'search-option'}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(division)}
                  >
                    <span className="search-option-label">{divisionLabel(division)}</span>
                    <span className="search-option-code">{division.pcode}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
