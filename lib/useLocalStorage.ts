import { useState, useEffect } from "react"

const parse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export const useLocalStorage = <S>(key: string, defaultValue: S): [S, any] => {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    const saved = localStorage.getItem(key)
    if (saved !== null) {
      setValue(parse(saved))
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(key)
    const newValue = JSON.stringify(value)
    if (saved === newValue) return
    localStorage.setItem(key, newValue)
  }, [value])

  return [value, setValue]
}


