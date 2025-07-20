import { Component, createMemo } from 'solid-js'

interface HighlightedCommandProps {
  command: string
  class?: string
}

const HighlightedCommand: Component<HighlightedCommandProps> = (props) => {
  const highlightedParts = createMemo(() => {
    const command = props.command
    const parts: Array<{ text: string; type: 'keyword' | 'flag' | 'path' | 'string' | 'normal' }> = []
    
    // Split command into words
    const words = command.split(/(\s+)/)
    
    words.forEach((word) => {
      if (word.trim() === '') {
        parts.push({ text: word, type: 'normal' })
        return
      }
      
      // Keywords
      const keywords = ['sudo', 'systemctl', 'ls', 'cd', 'pwd', 'ps', 'top', 'htop', 'cat', 'grep', 'find', 'chmod', 'chown', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'tar', 'zip', 'unzip', 'wget', 'curl', 'ssh', 'scp', 'rsync', 'docker', 'npm', 'yarn', 'git', 'vim', 'nano', 'less', 'more', 'tail', 'head', 'start', 'stop', 'restart', 'status', 'enable', 'disable']
      if (keywords.includes(word.toLowerCase())) {
        parts.push({ text: word, type: 'keyword' })
      }
      // Flags (start with -)
      else if (word.startsWith('-')) {
        parts.push({ text: word, type: 'flag' })
      }
      // Paths (start with /)
      else if (word.startsWith('/')) {
        parts.push({ text: word, type: 'path' })
      }
      // Strings (quoted)
      else if ((word.startsWith('"') && word.endsWith('"')) || (word.startsWith("'") && word.endsWith("'"))) {
        parts.push({ text: word, type: 'string' })
      }
      // Normal text
      else {
        parts.push({ text: word, type: 'normal' })
      }
    })
    
    return parts
  })
  
  const getColorClass = (type: string) => {
    switch (type) {
      case 'keyword': return 'text-blue-400 font-semibold'
      case 'flag': return 'text-yellow-400'
      case 'path': return 'text-green-400'
      case 'string': return 'text-purple-400'
      default: return 'text-white'
    }
  }
  
  return (
    <span class={props.class || 'font-mono'}>
      {highlightedParts().map((part, index) => (
        <span key={index} class={getColorClass(part.type)}>
          {part.text}
        </span>
      ))}
    </span>
  )
}

export default HighlightedCommand