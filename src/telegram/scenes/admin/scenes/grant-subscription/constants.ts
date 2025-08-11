export enum SceneCommand {
  GO_TO_ADMIN = 'GO_TO_ADMIN',
  RESTART = 'RESTART',
  CONFIRM_GRANT = 'CONFIRM_GRANT',
}

export enum SceneCallback {
  Duration3Days = 'duration:3_days',
  DurationWeek = 'duration:week',
  Duration2Weeks = 'duration:2_weeks',
  DurationMonth = 'duration:month',
  PlanBasic = 'plan:basic',
  PlanStandard = 'plan:standard',
  PlanPremium = 'plan:premium',
  BackToUser = 'back:user',
  BackToDuration = 'back:duration',
  BackToPlan = 'back:plan',
}

export const GRANT_SUBSCRIPTION_MEDIA = 'zenya-happy-grant.mp4';

export const DURATION_OPTIONS = {
  '3_days': { hours: 72, label: '3 дня' },
  week: { hours: 168, label: 'Неделя' },
  '2_weeks': { hours: 336, label: '2 недели' },
  month: { hours: 720, label: 'Месяц' },
} as const;

export type DurationType = keyof typeof DURATION_OPTIONS;

export const DURATION_LABEL: Record<DurationType, string> = {
  '3_days': 'три дня',
  week: 'неделя',
  '2_weeks': 'две недели',
  month: 'месяц',
};
