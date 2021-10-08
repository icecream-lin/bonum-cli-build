const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const cwd = process.cwd();
const config = require(path.resolve(cwd, 'bonum.config.js'));
const { spawn } = require('child_process');

const execCommand = (script) => {
    return new Promise((resolve, reject) => {
        script.command = script.command || 'npx vue-cli-service serve'
        const build_process = spawn('cmd.exe', ['/s', '/c', script.command], {
            stdio: config.log === false ? 'ignore' : 'inherit',
            cwd,
            env: {
                NODE_ENV: 'development',
                ...process.env,
                ...script.env,
            }
        });
        build_process.on('close', () => resolve(process.pid))
        build_process.on('error', (error) => reject(error))
    })
};

async function dev (package, cmd) {
    const { scripts } = config;
    if (package) {
        const script = scripts[package];
        if (script) {
            execCommand(script);
        }
    } else {
        let choices;
        if (cmd.search) {
            choices = Object.keys(scripts).filter(s => s.includes(cmd.search));
        } else {
            choices = Object.keys(scripts);
        }
        // 选择打包应用
        const answer = await inquirer.prompt([
            {
                name: 'package',
                type: 'list',
                message: 'choose package you want to run on dev',
                choices,
                filter: (val) => scripts[val]
            },
        ])
        if (answer && answer.package) {
            execCommand(answer.package);
        }
    }
}

module.exports = async (...args) => {
    try {
        return await dev(...args);
    } catch (err) {
        console.log(chalk.red(err));
        process.exit(1);
    }
}