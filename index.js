require('dotenv').config()

const _H = require('highland')
const { orderlessParallel } = require('@wmakeev/highland-tools')
const { getInstance } = require('moysklad-instance')

function getAuths() {
  const auths = []

  let index = 1
  while (true) {
    const auth = process.env[`MS_INSTANCE_AUTH_${index}`]

    if (auth) {
      const [login, password] = auth.split(';')

      if (!login || !password) {
        throw new Error(`Авторизиция ${index} указана некорретно`)
      }

      auths.push({ login, password })
      index++
    } else {
      return auths
    }
  }
}

function getParams() {
  const params = process.argv.slice(2).reduce((res, param) => {
    const [key, value] = param.split('=')
    res[key] = value
    return res
  }, {})

  if (!params.entity) {
    throw new Error('Не указана сущность для загрузки (entity)')
  }

  const entity = params.entity

  if (!params.accounts) {
    throw new Error('Не кол-во параллельно используемых аккаунтов (accounts)')
  }

  const accounts = Number.parseInt(params.accounts)

  if (!params.pages) {
    throw new Error('Не указано кол-во страниц (pages)')
  }

  const pages = Number.parseInt(params.pages)

  return { entity, accounts, pages, expand: params.expand }
}

async function testEntityCollectionFetchRate() {
  const auths = getAuths()

  if (auths.length === 0) {
    throw new Error('Не указана авторизация')
  }

  const { entity, accounts, pages, expand } = getParams()

  if (accounts > auths.length) {
    throw new Error(
      `Недостаточное кол-во авторизаций (${auths.length})` +
        ` для указанного кол-ва аккаунтов (${accounts})`
    )
  }

  const instances = auths
    .slice(0, accounts)
    .map((auth, index) => getInstance(`instance${index + 1}`, auth))

  const POOL_LEN = instances.length
  const LIMIT = 100

  function* pageGen(pages) {
    for (let i = 0; i < pages; i++) {
      yield i
    }
  }

  const getEntities = (ms, page) =>
    ms
      .GET(`entity/${entity}`, {
        expand,
        offset: page * LIMIT,
        limit: LIMIT
      })
      .then(({ rows }) => rows)

  const startTime = Date.now()

  const totalLoaded = await _H(pageGen(pages))
    .map(page => {
      const instanceIndex = page % POOL_LEN

      console.log(`Page ${page + 1} queued (account ${instanceIndex + 1})`)

      return _H(getEntities(instances[instanceIndex], page))
    })
    .through(orderlessParallel(6 * POOL_LEN + 1))
    .sequence()
    .reduce(0, res => res + 1)
    .toPromise(Promise)

  const endTime = Date.now()

  const rate = (endTime - startTime) / totalLoaded

  console.log(`===`)
  console.log(`Total loaded ${totalLoaded} entities`)
  console.log(`Rate ${rate} ms/entity`)
}

testEntityCollectionFetchRate().catch(err => {
  console.error(err.message)
})
