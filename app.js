const express = require('express')
const app = express()
app.use(express.json())

const bcrypt = require('bcrypt')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const path = require('path')
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDatabaseAndServer()

app.post('/register', async (request, response) => {
  try {
    let {username, name, password, gender, location} = request.body
    let hashedPassword = await bcrypt.hash(password, 10)

    let checkTheUsername = `
      SELECT *
      FROM user
      WHERE username = '${username}';
    `

    let userData = await db.get(checkTheUsername)

    if (userData === undefined) {
      if (password.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        let postNewUserQuery = `
          INSERT INTO user (username, name, password, gender, location)
          VALUES ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');
        `

        let newUserDetails = await db.run(postNewUserQuery)
        response.status(200)
        response.send('User created successfully')
      }
    } else {
      response.status(400)
      response.send('User already exists')
    }
  } catch (error) {
    console.error('Error during registration:', error)
    response.status(500)
    response.send('Internal server error')
  }
})

// login

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  let getUserQuery = `
      SELECT *
      FROM user
      WHERE
      username = '${username}'
      ;
    `

  let userData = await db.get(getUserQuery)

  if (userData === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userData.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// change password

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  let getUserQuery = `
      SELECT *
      FROM user
      WHERE
      username = '${username}'
      ;
    `

  let userData = await db.get(getUserQuery)

  if (userData === undefined) {
    response.status(400)
    response.send('User not registered')
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, userData.password)
    if (isValidPassword === true) {
      const lengthOfNewPassword = newPassword.length
      if (lengthOfNewPassword < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
          UPDATE user
          SET password = '${hashedPassword}';`
        await db.run(updatePasswordQuery)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})
module.exports = app
