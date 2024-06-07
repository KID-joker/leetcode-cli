'use strict';
var lodash = require('lodash');

var h = require('../helper');
var file = require('../file');
var chalk = require('../chalk');
var log = require('../log');
var core = require('../core');
var session = require('../session');

const cmd = {
  command: 'test <filename>',
  aliases: ['run'],
  desc:    'Test code',
  builder: function(yargs) {
    return yargs
      .option('i', {
        alias:    'interactive',
        type:     'boolean',
        default:  false,
        describe: 'Provide test case interactively'
      })
      .option('t', {
        alias:    'testcase',
        type:     'string',
        default:  '',
        describe: 'Provide test case'
      })
      .positional('filename', {
        type:     'string',
        default:  '',
        describe: 'Code file to test'
      })
      .example(chalk.yellow('leetcode test 1.two-sum.cpp'), 'Test code with default test case')
      .example(chalk.yellow('leetcode test 1.two-sum.cpp -t "[1,2,3]\\n4"'), 'Test code with customized test case');
  }
};

function printResult(actual, extra, k) {
  if (!actual.hasOwnProperty(k)) return;
  // HACk: leetcode still return 'Accepted' even the answer is wrong!!
  const v = actual[k] || '';
  if (k === 'state' && v === 'Accepted') return;

  let ok = actual.ok;

  const lines = Array.isArray(v) ? v : [v];
  for (let line of lines) {
    const extraInfo = extra ? ` (${extra})` : '';
    if (k !== 'state') line = lodash.startCase(k) + extraInfo + ': ' + line;
    log.info('  ' + h.prettyText(' ' + line, ok));
  }
}

function runTest(argv) {
  if (!file.exist(argv.filename))
    return log.fatal('File ' + argv.filename + ' not exist!');

  const meta = file.meta(argv.filename);

  core.getProblem(meta.id, true, function(e, problem) {
    if (e) return log.fail(e);

    if (!problem.testable)
      return log.fail('not testable? please submit directly!');

    if (argv.testcase)
      problem.testcase = argv.testcase.replace(/\\n/g, '\n');

    if (!problem.testcase)
      return log.fail('missing testcase?');

    problem.file = argv.filename;
    problem.lang = meta.lang;

    core.testProblem(problem, function(e, results) {
      if (e) return log.fail(e);

      const result = results[0];
      if (result.state === 'Accepted')
        result.state = 'Finished';
      printResult(result, null, 'state');
      printResult(result, null, 'error');

      result.your_input = problem.testcase;
      result.output = result.answer;
      result.stdout = result.stdout.slice(1, -1).replace(/\\n/g, '\n');
      printResult(result, null, 'your_input');
      printResult(result, result.runtime, 'output');
      printResult(result, null, 'expected_answer');
      printResult(result, null, 'stdout');
    });
  });
}

cmd.handler = function(argv) {
  session.argv = argv;
  if (!argv.i)
    return runTest(argv);

  h.readStdin(function(e, data) {
    if (e) return log.fail(e);

    argv.testcase = data;
    return runTest(argv);
  });
};

module.exports = cmd;
