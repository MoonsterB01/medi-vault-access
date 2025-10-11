import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

/**
 * @typedef {"dark" | "light" | "system"} Theme
 * @description The possible theme values.
 */

/**
 * @interface ThemeProviderProps
 * @description Defines the props for the ThemeProvider component.
 * @property {React.ReactNode} children - The child components to be rendered within the provider.
 * @property {Theme} [defaultTheme="system"] - The default theme to use.
 * @property {string} [storageKey="vite-ui-theme"] - The key to use for storing the theme in local storage.
 */
type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * @interface ThemeProviderState
 * @description Defines the state for the ThemeProvider.
 * @property {Theme} theme - The current theme.
 * @property {(theme: Theme) => void} setTheme - A function to set the theme.
 */
type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

/**
 * @function ThemeProvider
 * @description A component that provides a theme to its children. It manages the theme state and applies the theme to the root element.
 * @param {ThemeProviderProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered ThemeProvider component.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

/**
 * @function useTheme
 * @description A custom hook to access the theme context.
 * @returns {ThemeProviderState} - The theme state and a function to set the theme.
 * @throws {Error} - If the hook is used outside of a ThemeProvider.
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}