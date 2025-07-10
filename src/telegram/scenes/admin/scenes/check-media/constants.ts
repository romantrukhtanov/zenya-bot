export enum SceneCommand {
  GO_TO_ADMIN = 'GO_TO_ADMIN',
  SELECT_ANOTHER_TYPE = 'SELECT_ANOTHER_TYPE',
}

export enum SceneCallback {
  SelectPhotos = 'select:photos',
  SelectVideos = 'select:videos',
  SelectFiles = 'select:files',
  ResendMedia = 'resend:media:',
  Noop = 'noop',
}
