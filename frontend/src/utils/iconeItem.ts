// Emoji por nome de item (cantina/almoxarifado). Sem correspondencia: null,
// e a tela cai no avatar de iniciais (nunca repete o icone de outro item).

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Ordem importa: termos mais especificos antes dos genericos
const REGRAS: [RegExp, string][] = [
  [/\bovo/, '🥚'],
  [/arroz/, '🍚'],
  [/feij/, '🫘'],
  [/cafe/, '☕'],
  [/acucar/, '🧂'],
  [/\bsal\b|sal grosso/, '🧂'],
  [/oleo|azeite/, '🫒'],
  [/macarr|massa|espaguete/, '🍝'],
  [/farinha|fuba|trigo/, '🌾'],
  [/leite/, '🥛'],
  [/queijo/, '🧀'],
  [/manteiga|margarina/, '🧈'],
  [/pao|biscoito|bolacha/, '🍞'],
  [/frango|galinha|coxa|peito de/, '🍗'],
  [/linguica|salsicha|bacon/, '🌭'],
  [/peixe|tilapia|sardinha|atum/, '🐟'],
  [/porco|suin|costela suin|pernil/, '🥓'],
  [/carne|bovin|boi|acem|patinho|alcatra|picanha|costela|moida/, '🥩'],
  [/tomate/, '🍅'],
  [/cebola/, '🧅'],
  [/alho/, '🧄'],
  [/batata/, '🥔'],
  [/mandioca|aipim|macaxeira/, '🥔'],
  [/cenoura/, '🥕'],
  [/alface|couve|repolho|verdura|hortal/, '🥬'],
  [/banana/, '🍌'],
  [/laranja|limao|tangerina|mexerica/, '🍊'],
  [/maca\b/, '🍎'],
  [/melancia|melao/, '🍉'],
  [/abacaxi/, '🍍'],
  [/refrigerante|coca|guarana|suco/, '🥤'],
  [/agua/, '💧'],
  [/cerveja/, '🍺'],
  [/detergente|sabao|sabonete|desinfetante|agua sanitaria|cloro|esponja/, '🧼'],
  [/papel higienico|papel toalha|guardanapo/, '🧻'],
  [/gas\b|botijao/, '🔥'],
]

export const iconeDoItem = (nome: string): string | null => {
  const n = norm(nome || '')
  for (const [re, emoji] of REGRAS) {
    if (re.test(n)) return emoji
  }
  return null
}
