import React, { createContext, useContext, useMemo, useState } from 'react'

const UiCtx = createContext(null)

export function UiProvider({ children }) {
  const [mode, setMode] = useState(localStorage.getItem('ui_mode') || 'light')

  const value = useMemo(() => ({
    mode,
    toggleMode: () => setMode(m => {
      const next = m === 'light' ? 'dark' : 'light'
      localStorage.setItem('ui_mode', next)
      return next
    })
  }), [mode])

  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>
}

export function useUi() {
  return useContext(UiCtx)
}
