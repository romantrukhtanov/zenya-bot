const util = require('node:util');
const prompts = require('prompts');
const kleur = require('kleur');
const exec = util.promisify(require('node:child_process').exec);

const projectTypes = ['PSY'];
const maxDescriptionLength = 50;
const minDescriptionLength = 3;
const mainBranch = 'main';

const branchTypeLabels = {
  feat: '🎸 Feature',
  fix: '🐛 Fix',
  refactor: '💡 Refactor',
  ci: '🎡 CI',
  style: '💄 Style',
  test: '💍 Test',
  perf: '⚡️ Performance',
  chore: '🤖 Chore',
  docs: '✏️ Docs',
  hotfix: '🔥 Hotfix',
};

const issueNumberExample = `${projectTypes.join('|')}-000`;
const issueNumberRegex = /^(PSY)-[0-9]+$/;
const descriptionRegex = /^[A-Za-z_ ]+$/;

const getCurrentBranch = async () => {
  const { stdout } = await exec('git rev-parse --abbrev-ref HEAD');

  if (!stdout) {
    throw Error('Unable to get branch name');
  }

  return stdout.trim();
};

const createBranch = name => {
  return exec(`git checkout -b "${name}"`);
};

const requirePrompts = async options => {
  const result = await prompts({ ...options, name: 'value' });

  if (!result.value) {
    process.exit(0);
  }

  return result.value;
};

const cli = async () => {
  const currentBranch = await getCurrentBranch();

  const isMain = currentBranch === mainBranch;

  if (!isMain) {
    const continueWithNonMainOrigin = await requirePrompts({
      type: 'confirm',
      message: `The repository ${kleur.red(`NOT on the main branch`)}, do you want to create a new branch from ${kleur.yellow(
        currentBranch
      )}?`,
    });

    if (!continueWithNonMainOrigin) {
      process.exit();
    }
  }

  const branchType = await requirePrompts({
    type: 'select',
    message: 'Select branch type',
    choices: Object.keys(branchTypeLabels).map(branchType => ({
      title: branchTypeLabels[branchType],
      description: branchType,
      value: branchType,
    })),
  });

  const issueNumber = await requirePrompts({
    type: 'text',
    message: `What issue are you working on? (${issueNumberExample})`,
    validate: value => (issueNumberRegex.test(value) ? true : 'Invalid issue number'),
  });

  const description = await requirePrompts({
    type: 'text',
    message: 'Enter small description of the branch',
    validate: value => {
      if (value.length < minDescriptionLength) {
        return `Description must be more than ${minDescriptionLength} symbols`;
      }
      if (value.length > maxDescriptionLength) {
        return `Description must be under ${maxDescriptionLength} symbols`;
      }
      if (!descriptionRegex.test(value)) {
        return 'Description must contain only letters, spaces and underscores';
      }

      return true;
    },
    format: value => value.trim().replaceAll(' ', '_').toLowerCase(),
  });

  const branchName = `${branchType}/${issueNumber}_${description}`;

  await createBranch(branchName);

  console.log(`\n👷 New branch ${kleur.green(branchName)} created from ${kleur.yellow(currentBranch)}`);
};

cli();
