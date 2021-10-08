#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const requiredVersion = require('../package.json').engines.node;
const semver = require('semver');

function checkNodeVersion (want, id) {
    if (!semver.satisfies(process.version, want, { includePrerelease: true })) {
        console.log(chalk.red(
            'You are using Node ' + process.version + ', but this version of ' + id +
            ' requires Node ' + want + '.\nPlease upgrade your Node version.'
        ));
        process.exit(1);
    }
}

checkNodeVersion(requiredVersion, 'bonum-cli');

const EOL_NODE_MAJORS = ['8.x', '9.x', '11.x', '13.x']
for (const major of EOL_NODE_MAJORS) {
    if (semver.satisfies(process.version, major)) {
        console.log(chalk.red(
            `You are using Node ${process.version}.\n` +
            `Node.js ${major} has already reached end-of-life and will not be supported in future major releases.\n` +
            `It's strongly recommended to use an active LTS version instead.`
        ));
    }
}

program
    .version(`Version is ${require('../package.json').version}`)
    .description('自动打包脚手架')
    .usage('<command> [options]');

program
    .command('build [packages...]')
    .description('指定打包编译的应用，空格分隔多个应用')
    .option('-a, --all', '指定打包所有应用')
    .option('-s, --search <name>', '检索包名')
    .option('-S, --sync', '指定同步打包应用， 默认为异步打包')
    .action((packages, cmd) => {
        require('../lib/build')(packages, cmd);
    });

program
    .command('dev [package]')
    .description('指定本地执行的应用')
    .option('-s, --search <name>', '检索包名')
    .action((package, cmd) => {
        require('../lib/dev')(package, cmd);
    });

program.parse(process.argv);