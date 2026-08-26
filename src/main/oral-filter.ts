// 口语化词替换表
export function applyOralFilter(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\butilize[sd]?\b/gi, 'use'],
    [/\bleverage[sd]?\b/gi, 'use'],
    [/\bimplement[sd]?\b/gi, 'build'],
    [/\bdemonstrate[sd]?\b/gi, 'show'],
    [/\bextensive(ly)?\b/gi, 'a lot of'],
    [/\bfacilitate[sd]?\b/gi, 'help'],
    [/\boptimize[sd]?\b/gi, 'improve'],
    [/\benhance[sd]?\b/gi, 'improve'],
    [/\baccordingly\b/gi, 'so'],
    [/\bcomprehensive\b/gi, 'complete'],
    [/\bsignificant(ly)?\b/gi, 'big'],
    [/\bsubsequent(ly)?\b/gi, 'later'],
    [/\bnevertheless\b/gi, 'but'],
    [/\bmoreover\b/gi, 'also'],
    [/\bfurthermore\b/gi, 'also'],
    [/\bconsequently\b/gi, 'so'],
    [/\bI have extensive experience in\b/gi, 'I have worked on'],
    [/\bI was responsible for\b/gi, 'I helped with'],
    [/\bin order to\b/gi, 'to']
  ]
  let result = text
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// 语义分块：在句子边界插入停顿标记
export function applyPauseMarkers(text: string): string {
  // 在句号、问号、感叹号后插入换行，形成分块
  return text
    .replace(/\.(\s+)/g, '.\n\n')
    .replace(/\?(\s+)/g, '?\n\n')
    .replace(/!(\s+)/g, '!\n\n')
    .replace(/,\s+(?=[A-Z])/g, ',\n') // 逗号后如果是大写字母（新句子），换行
    .trim()
}
