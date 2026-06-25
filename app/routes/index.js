const express = require('express');
const router = express.Router();


const adminRoute = require('./adminRoute')
const userRoute = require('./userRoute')


router.use('/admin', adminRoute)

router.use('/user', userRoute)



module.exports = router