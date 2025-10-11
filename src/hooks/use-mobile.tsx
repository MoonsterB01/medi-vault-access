import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * @function useIsMobile
 * @description A custom hook that returns a boolean indicating whether the current screen width is considered mobile.
 * @returns {boolean} - `true` if the screen width is less than the mobile breakpoint, `false` otherwise.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
