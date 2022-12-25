/*  ------------------------------------------------------------------------ */

/*  NOTE: there's a great tool for exploring the AST output generated
          by various JS parsers, including ESpree (that we use now):

          https://astexplorer.net/

/*  ------------------------------------------------------------------------ */

const fromCamelCase = s => s.replace (/[a-z][A-Z]/g, x => x[0] + '_' + x[1].toLowerCase ()) // fromCamelCase → from_camel_case

/*  ------------------------------------------------------------------------ */

const blockTree = (n, parents = []) => (match[n.type] || match.other) (n, n => blockTree (n, [n, ...parents]), parents)

    , indentAndJoin = depth => x => Array.isArray (x)
                                                ? x.map (indentAndJoin (depth + 1)).join ('\n')
                                                : '    '.repeat (depth) + x

/*  ------------------------------------------------------------------------ */

const match = {

    Program: ({ type, body }, $) =>

        body.map ($),

    ClassDeclaration: ({ id, superClass, body: { body } }, $) =>

        [
            'class ' + $(id) + ' extends ' + $(superClass),
            '',
            ...body.map ($)
        ],

    MethodDefinition: ({ kind, key: { name }, value: { params = [], body: { body } } }, $) => 

        [
            'def '
                + (kind === 'constructor' ? '__init__' : fromCamelCase (name))
                + '('
                + ['self', ...params.map ($)].join (', ')
                + '):',

            body.map ($),
            ''
        ],

    Identifier: ({ name }) =>

        name,

    Super: ({}, $, parents) =>

        'super (' + $(parents.find (n => n.type === 'ClassDeclaration').id) + ', self).__init__',

    AssignmentPattern: ({ left, right }, $) =>

        $(left) + '=' + $(right),

    ExpressionStatement: ({ expression }, $) =>

        $(expression),

    AssignmentExpression: ({ left, right, operator = '=' }, $) =>
    
        $(left) + ' ' + operator + ' ' + $(right),

    ExpressionStatement: ({ expression }, $) =>

        $(expression),
    
    ThisExpression: () => 'self',

    AwaitExpression: ({ argument: arg }, $) => {
        return (match[arg.type] || match.other)(arg, n => blockTree(n))
    },

    MemberExpression: ({ object, property, ...rest }, $) => {
        if (object.type === 'Identifier' && property.type === 'Identifier') {
            if (object.name === 'Object' && property.name === 'keys') {
                return 'list'
            } else if (property.name === 'length') {
                return 'len(' + object.name + ')'
            } else if (property.name === 'toUpperCase') {
                return object.name + '.upper'
            } else if (property.name === 'split') {
                return object.name + '.split'
            } else if (property.name === 'push') {
                return object.name + '.append'
            }
            return object.name + '[' + property.name + ']'
        } else if (object.type === 'Identifier' && property.type === 'Literal') {
            return object.name + "['" + property.value + "']"
        }
        return (match[object.type] !== undefined && match[property.type] !== undefined) ? match[object.type](object, $) + '.' + match[property.type](property, $) : ''
    },

    CallExpression: ({ callee, arguments: args /* arguments is reserved keyword in strict mode, cannot use as a var name */ }, $) => {

        if (args.length === 0) {
            return $(callee) + '()'
        }
        let result = $(callee) + '(' + args.map ($).join (',')
        if (callee.object && callee.property && callee.object.name === 'Object' && callee.property.name === 'keys') {
            result += '.keys()'
        }
        result += ')'
        return result
    },

    ObjectExpression: ({ properties }, $) =>

        '{ ' + properties.map ($).join (', ') + ' }',

    ArrayPattern: ({ elements }, $) => 
    
        elements.map($).join(', '),

    ArrayExpression: ({ elements }, $) =>

        '[' + elements.map ($).join (', ') + ']',

    Property: ({ key, value }, $) =>

        $(key) + ': ' + $(value),

    Literal: ({ value }, $) =>

        "'" + value + "'",

    ReturnStatement: ({ argument: arg }) => match[arg.type] ? 'return ' + match[arg.type](arg) : 'return None',
    
    VariableDeclaration: ({ declarations, kind }) => declarations.map((declaration) =>
            (match[declaration.id.type] || match.other)(declaration.id, n => blockTree(n)) + ' = ' + (
            (match[declaration.init.type] || match.other)(declaration.init, n => blockTree(n)))
    ).join('\n'),

    // BinaryExpression: ({ left, right }, $) => '',

    // UpdateExpression: ({ operator, argument }, $) => '',

    ForStatement: ({ init, test, update, body }, $) => {
        let forBody = 'for '

        const initText = match[init.type] ? match[init.type](init, $) : ''
        const parsedInit = initText.split('=')
        if (parsedInit.length > 0) {
            forBody += parsedInit[0].replace(' ', '') + ' in range(' + parsedInit[1].replace(' ', '').replace('\'', '').replace('\'', '')
        }
        const binaryText = match[test.right.type] ? match[test.right.type](test.right, $) : 'g'
        forBody += ',' + binaryText
        forBody += ':\n'

        // TODO: depth issue
        // return [
        //     forBody,
        //     ...body.body.map(n => blockTree (n))
        // ]
        forBody += body.body.map(n => blockTree (n)).map(n => '    '.repeat(3) + n).join('\n')
        return forBody
    },

    other: ({ type, start, end, ...rest }) =>

        `<@! ${type}: ${Object.keys (rest).join (', ')} !@>` // to make sure it won't parse
}

/*  ------------------------------------------------------------------------ */

module.exports = {

    generateFrom: ast => indentAndJoin (-2) (blockTree (ast))
}

/*  ------------------------------------------------------------------------ */
