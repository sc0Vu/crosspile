/*  ------------------------------------------------------------------------ */

const espree = require ('espree')
    , python = require ('./languages/python')

/*  ------------------------------------------------------------------------ */

module.exports = function crosspile (js, { from = 'JavaScript', to } = {}) {

    const ast = espree.parse (js, {
        ecmaVersion: 8,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true
        }
    })

    return python.generateFrom (ast)
}

/*  ------------------------------------------------------------------------ */
