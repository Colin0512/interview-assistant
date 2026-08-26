// 口语化词替换表
// Helper: build a tense-aware replacement callback
function makeReplacement(base: string, thirdPerson: string, past: string): (match: string) => string {
  return (match: string) => {
    let result: string
    if (/ed$/i.test(match)) result = past
    else if (/s$/i.test(match)) result = thirdPerson
    else result = base
    // 如果原文首字母大写，替换后也首字母大写
    if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
      return result[0].toUpperCase() + result.slice(1)
    }
    return result
  }
}

// 口语化词替换表
export function applyOralFilter(text: string): string {
  if (text == null) return text
  const replacements: [RegExp, string | ((match: string) => string)][] = [
    // 短语规则（优先匹配，防止词级规则误替换）
    [/I have extensive experience in/gi, 'I have worked on'],
    [/I was responsible for/gi, 'I helped with'],
    [/in order to/gi, 'to'],
    // 词级规则（带时态回调）
    [/utilize(?:s|ed)?/gi, makeReplacement('use', 'uses', 'used')],
    [/leverage(?:s|ed)?/gi, makeReplacement('use', 'uses', 'used')],
    [/implement(?:s|ed)?/gi, makeReplacement('build', 'builds', 'built')],
    [/demonstrate(?:s|ed)?/gi, makeReplacement('show', 'shows', 'showed')],
    [/extensive/gi, 'a lot of'],
    [/extensively/gi, 'a lot'],
    [/facilitate(?:s|ed)?/gi, makeReplacement('help', 'helps', 'helped')],
    [/optimize(?:s|ed)?/gi, makeReplacement('improve', 'improves', 'improved')],
    [/enhance(?:s|ed)?/gi, makeReplacement('improve', 'improves', 'improved')],
    [/accordingly/gi, 'so'],
    [/comprehensive/gi, 'thorough'],
    [/significant/gi, 'big'],
    [/significantly/gi, 'much'],
    [/subsequent(ly)?/gi, 'later'],
    [/nevertheless/gi, 'but'],
    [/moreover/gi, 'also'],
    [/furthermore/gi, 'also'],
    [/consequently/gi, 'so'],
  ]
  let result = text
  for (const [pattern, replacement] of replacements) {
    if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement)
    } else {
      result = result.replace(pattern, (match: string) => {
        // 如果原文首字母大写，替换后也首字母大写
        if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
          return replacement[0].toUpperCase() + replacement.slice(1)
        }
        return replacement
      })
    }
  }
  return result
}

// 语义分块：在句子边界插入停顿标记
export function applyPauseMarkers(text: string): string {
  if (text == null) return text
  // 在句号、问号、感叹号后插入换行，形成分块
  return text
    .replace(/\.(\s+)/g, '.\n\n')
    .replace(/\?(\s+)/g, '?\n\n')
    .replace(/!(\s+)/g, '!\n\n')
    // 逗号后如果是连接副词，换行
    .replace(/,\s+(?=(?:However|Therefore|Moreover|Furthermore|Consequently|In addition|For example|For instance)\b)/g, ',\n')
    .trim()
}
