/**
 * binary.operations.js
 * Management over available PHP versions
 */

/* Count of associated php binaries */
function binaryGetCount() {
  return Object.keys(conf.get('php.versions')).length;
}

/* Converts binary string to a save-safe string */
function binaryConvertVersionToSave(version) {
  return version.replace(/\./g, ':');
}

/* Converts binary save-safe string to regular string */
function binaryConvertVersionToShow(version) {
  return version.replace(/:/g, '.');
}

/**
* @param {string} path - path to php binary
* @param {string} replaced - replacing . with : (configstore workaround)
*/
function binaryGetVersion(path, replaced) {
  const response = runner.execSync(path + ' --version', { encoding: 'utf8' });

  // Is this PHP?
  if (/^PHP/.test(response)) {
    // Get PHP version
    const result = response.match(/^PHP ([0-9\.]+)/);
    if (result && result[1]) {
      if (replaced) {
        return binaryConvertVersionToSave(result[1]);
      }

      return result[1];
    }
  }

  return false;
}

function binaryLineGetTemplate(version, path, inUse) {
  return [
    '<tr ' + (inUse ? 'class="info"' : '') + '>',
    '  <td>' + binaryConvertVersionToShow(version) + '</td>',
    '  <td>' + path + '</td>',
    '  <td class="text-right">',
    '    <div class="btn-group">',
    '      <button class="btn btn-default btn-xs" onclick="makeDefaultVersion(\''
            + version + '\')">',
    '        <span class="glyphicon glyphicon-ok" aria-hidden="true"></span>',
    '      </button>',
    '      <button class="btn btn-default btn-xs" onclick="removeVersion(\'' + version + '\')">',
    '        <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>',
    '      </button>',
    '    </div>',
    '  </td>',
    '</tr>'
  ].join('\n');
}

/**
 * Binary list functions
 */
function binaryUpdateList() {
  $('#binary-list').empty();

  const versions = conf.get('php.versions');
  const inUse = conf.get('php.default');

  Object.keys(versions).forEach((v) => {
    $('#binary-list').append(binaryLineGetTemplate(v, versions[v], (inUse === v)));
  });
}

/**
 * Get current version
 */
function phpGetCurrVersion() {
  const curr = conf.get('php.default');

  if (curr) {
    return binaryConvertVersionToShow(conf.get('php.default'));
  }

  return false;
}

/* Updates binary path used by the runner */
function updatePhpPath() {
  // Change phpPath for runner
  phpPath = conf.get('php.versions.' + conf.get('php.default'));

  // Change PHP version number shown in app
  $('#run-version').html(phpGetCurrVersion());
}

/**
 * Set new PHP binary as default
 * @param {string} which - version / if given none, auto-select
 */
function binarySetNewDefault(which) {
  if (which) {
    conf.set('php.default', which);
  } else if (binaryGetCount()) {
    // Set first option on the list as default (if we have any)
    const vKeys = Object.keys(conf.get('php.versions'));
    conf.set('php.default', vKeys[0]);
  } else {
    conf.del('php.default');
  }
  updatePhpPath();
}

/* Adds a binary, if valid */
function binaryAdd(path) {
  // Is this a file?
  try {
    const file = fs.lstatSync(path);
    if (!file.isFile() && !file.isSymbolicLink()) {
      return false;
    }
  } catch (e) {
    // I couldn't even find the file!!!
    return false;
  }

  // So, let's find out it's version
  const vers = binaryGetVersion(path);

  // Is this a valid version?
  if (!vers) {
    return false;
  }

  // Saves to the versions list
  conf.set('php.versions.' + binaryConvertVersionToSave(vers), path);
  return true;
}

/* Searches for a PHP binary */
function binaryDialogAdd() {
  const file = dialog.showOpenDialog({
    title: i18n.__('Find PHP binary')
  });

  if (file && file[0]) {
    // Get path
    const path = file[0];

    // Oops! Invalid PHP binary!
    if (!binaryAdd(path)) {
      dialog.showErrorBox(i18n.__('Error'), i18n.__('Invalid PHP binary'));
      return;
    }

    // Is this our first?
    if (binaryGetCount() === 1) {
      // Please, set it as our new default
      binarySetNewDefault();
    }

    // Update list
    binaryUpdateList();
  }
}

/* Remove a PHP version from listing */
function binaryRemove(version) {
  conf.del('php.versions.' + version);
  // Are you deleting your default version?
  if (conf.get('php.default') === version) {
    binarySetNewDefault();
  }
}

/**
 * Set default PHP version to run code
 * @param {string} version - version to set as default
 */
function makeDefaultVersion(version) {
  binarySetNewDefault(version);
  binaryUpdateList();
}

/**
 * Remove a PHP version from the listing
 * @param {string} version - version to remove
 */
function removeVersion(version) {
  const opt = dialog.showMessageBox({
    type: 'question',
    title: i18n.__('Are you sure?'),
    message: i18n.__('Removing {{version}} version. Are you sure?',
                    { version: binaryConvertVersionToShow(version) }),
    buttons: [i18n.__('Yes'), i18n.__('No')],
  });

  // Yes = 0; No = 1
  if (opt === 0) {
    binaryRemove(version);
    binaryUpdateList();
  }
}
