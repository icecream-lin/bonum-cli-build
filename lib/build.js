const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const cwd = process.cwd();
const config = require(path.resolve(cwd, 'bonum.config.js'));
const { spawn } = require('child_process');
const osLength = require('os').length;

const execCommand = (script) => {
   return new Promise((resolve, reject) => {
      script.command = script.command || 'npx vue-cli-service build'
      if (script.vue) {
         Object.keys(script.vue).forEach(k => {
            let val = script.vue[k];
            if (k === 'dest' && config.outputDir !== '') {
               config.outputDir = typeof config.outputDir === 'undefined' ? 'dist' : config.outputDir;
               val = `${config.outputDir}/${val}`
            }
            script.command += ` --${k} ${val}`
         });
      }
      console.log(chalk.blue(`package ${script.name} start building...`));
      const build_process = spawn('cmd.exe', ['/s', '/c', script.command], {
         stdio: config.log === false ? 'ignore' : 'inherit',
         cwd,
         env: {
            NODE_ENV: 'production',
            ...process.env,
            ...script.env,
         }
      });
      build_process.on('close', () => resolve(process.pid))
      build_process.on('error', (error) => reject(error))
   })
};

function buildSync (packages) {
   if (packages.length > 0) {
      execCommand(packages[0])
         .then(() => buildSync(packages.slice(1)))
         .catch(err => console.error(err))
   }
}

function buildAsync (packages) {
   let worker = config.worker;
   const pLength = packages.length;
   worker = worker > osLength ? osLength : worker;
   worker = worker > pLength ? pLength : worker;
   let curWorker = 0;
   const buildPromises = new Array(packages.length);
   function exec (resolve, reject) {
      curWorker++;
      const current = packages[0];
      execCommand(current).then(() => {
         curWorker--;
         console.log(chalk.green(`package ${current.name} build success`));
         resolve(null);
      }).catch(err => reject(err));
      packages.splice(0, 1);
   }
   for (let i = 0; i < buildPromises.length; i++) {
      buildPromises[i] = new Promise((resolve, reject) => {
         if (curWorker < worker) {
            exec(resolve, reject);
         } else {
            const timer = setInterval(() => {
               if (curWorker < worker) {
                  clearInterval(timer);
                  exec(resolve, reject);
               }
            }, 100);
         }
      })
   }
   Promise.all(buildPromises).then(() => {
      if (buildPromises.length > 1) {
         console.log(chalk.green('all packages build success'));  
      }
   });
}

function buildPackages (packages, sync = false) {
   if (packages && packages.length > 0) {
      if (sync) {
         buildSync(packages);
      } else {
         buildAsync(packages);
      }
   }
}

function buildAllPackages (sync = false) {
   const packages = Object.keys(config.scripts).map(k => ({
      name: k,
      ...config.scripts[k]
   }));
   if (packages && packages.length > 0) {
      if (sync) {
         buildSync(packages);
      } else {
         buildAsync(packages);
      }
   }
}

async function build (packages, cmd) {
   if (cmd.all) {
      // 打包所有应用
      buildAllPackages(cmd.sync);
   } else {
      const { scripts } = config;
      // 打包行内指定应用
      if (packages && packages.length > 0) {
         packages = packages.map(p => ({
            name: p,
            ...scripts[p]
         }));
         buildPackages(packages, cmd.sync);
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
               name: 'packages',
               type: 'checkbox',
               message: 'choose packages you want to build',
               default: 'build all packages',
               choices,
               filter: (val) => {
                  return val.map(p => ({
                     name: p,
                     ...scripts[p]
                  }));
               }
            },
         ])
         buildPackages(answer.packages, cmd.sync);
      }
   }
}

module.exports = async (...args) => {
   try {
      return await build(...args);
   } catch (err) {
      console.log(chalk.red(err));
      process.exit(1);
   }
}