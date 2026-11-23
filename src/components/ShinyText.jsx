// Sweeping shine over text (inspired by React Bits "ShinyText").
export default function ShinyText({ children, className = '' }) {
  return <span className={`shiny-text ${className}`}>{children}</span>
}
