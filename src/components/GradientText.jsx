// Animated gradient text (inspired by React Bits "GradientText").
export default function GradientText({ children, className = '', colors = ['#a78bfa', '#22d3ee', '#f472b6', '#a78bfa'] }) {
  return (
    <span className={`gradient-text ${className}`} style={{ backgroundImage: `linear-gradient(90deg, ${colors.join(',')})` }}>
      {children}
    </span>
  )
}
