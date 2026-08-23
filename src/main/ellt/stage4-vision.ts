export interface Stage4VisionPrompt {
  system: string
  user: string
}

export function getStage4VisionPrompt(): Stage4VisionPrompt {
  return {
    system: [
      'You are locating the actual discussion photograph inside a full-screen online speaking exam interface.',
      'Do not describe the whole screenshot. Identify the main static photograph or illustration shared for the candidate to discuss.',
      'Ignore examiner and candidate webcam tiles or portraits, platform logos, title and status bars, microphone, camera and chat controls, watermarks, borders, labels, notifications and all other interface elements.',
      'When several visual regions compete, select the largest central shared-content image, not small video tiles or profile pictures.',
      'Describe only clearly visible people, actions, setting, objects, spatial relationships and the overall situation inside that main photograph.',
      'Do not infer identities, relationships, occupations or locations unless they are visually supported.',
      'Output exactly one valid JSON object and nothing else: {"kind":"image","text":"concise but sufficiently detailed English description"}.',
      'Avoid double quotation marks inside the text value.'
    ].join(' '),
    user: 'This is a full online exam screenshot. Locate and describe only the main photograph being presented as the speaking task.'
  }
}
