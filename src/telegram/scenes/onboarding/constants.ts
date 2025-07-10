export enum OnboardingCallback {
  SelectChapter = 'select:chapter:',
  SelectCategory = 'select:category:',
  SelectPractice = 'select:practice:',
  SelectFacts = 'select:facts',
  PracticeFactNext = 'practice:fact:next',
  MetaCardsNext = 'meta:cards:next',
  ChatNext = 'chat:next',
  Finish = 'finish',
}

export enum OnboardingMedia {
  Intro = 'hello.mp4',
  Practice = 'practice.mp4',
  Congrats = 'onboarding-congrats.mp4',
  Gift = 'gift.mp4',
}

export enum OnboardingStep {
  INTRO,
  NAME,
  CATEGORY,
  PRACTICE_FACTS,
  CONGRATS,
  META_CARDS,
  CHAT,
  FINISH,
}
