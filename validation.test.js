// Testes automatizados de validação – Meu Controle 2.0
// Como executar (na pasta do projeto):  node --test tests/validation.test.js
//
// O código do sistema fica dentro do index.html. Este teste extrai de lá as
// funções de validação (parseAmount e validEmail) e a constante MAX_VALOR e
// as executa de forma isolada, sem abrir o navegador.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extrai o texto de uma função (por nome) contando as chaves.
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função ${name} não encontrada no index.html`);
  let i = html.indexOf('{', start), depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) break;
  }
  return html.slice(start, i + 1);
}

const maxMatch = html.match(/const MAX_VALOR\s*=\s*([\d_.]+)/);
const MAX_VALOR = maxMatch ? Number(maxMatch[1]) : undefined;

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${extractFunction('parseAmount')}\n${extractFunction('validEmail')}\nthis.parseAmount = parseAmount; this.validEmail = validEmail;`,
  sandbox
);
const { parseAmount, validEmail } = sandbox;

test('CT13 – valores válidos são lidos corretamente', () => {
  assert.equal(parseAmount('150,75'), 150.75);
  assert.equal(parseAmount('1500'), 1500);
  assert.equal(parseAmount('R$ 200,00'), 200);
  assert.equal(parseAmount('1.500'), 1500);          // NC01: antes virava 1,50
  assert.equal(parseAmount('1.500,75'), 1500.75);
});

test('CT13 – valores com letras ou formato inválido são rejeitados', () => {
  assert.ok(Number.isNaN(parseAmount('10abc')));     // NC02: antes virava 10
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('')));
  assert.ok(Number.isNaN(parseAmount('1,2,3')));
});

test('CT08 – valor negativo não é um valor positivo válido', () => {
  const n = parseAmount('-50,00');
  assert.ok(!(n > 0), 'valor negativo não pode ser aceito como lançamento');
});

test('CT13 – existe limite máximo de valor (NC03)', () => {
  assert.equal(MAX_VALOR, 999999999.99, 'MAX_VALOR deve estar definido como 999.999.999,99');
  const absurdo = parseAmount('99999999999999');
  assert.ok(Number.isNaN(absurdo) || absurdo > MAX_VALOR,
    'valor absurdo deve ficar acima do limite (e ser rejeitado pelo cadastro)');
});

test('CT01 – e-mail com formato válido é aceito e inválido é rejeitado', () => {
  assert.equal(validEmail('ana@exemplo.com'), true);
  assert.equal(validEmail('email-invalido'), false);
  assert.equal(validEmail('ana@'), false);
  assert.equal(validEmail('ana @exemplo.com'), false);
});
