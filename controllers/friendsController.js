const mongoose = require('mongoose');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')

const RequestModel= mongoose.model('Request');

let getAllRequests=(req,res)=>{
    if(!check.isEmpty(req.query.userId)){
        let findQuery = {
            $or: [
            {  $and:  [
                            {senderId: req.query.userId},
                            {active:true}
                        ]
            },
            {
                $and:  [
                    {receiverId: req.query.userId},
                    {active:true}
                ]        
            }
            ]
        }
        RequestModel.find(findQuery)
        .skip(parseInt(req.body.skip)|| 0)
        .limit(10)
        .select('-_id -_v -createdOn').sort('-createdOn').lean().exec((err,result)=>{
            if(err){
                logger.error(err+'db error occurred','friendsController:getAllRequests()',1)            
                res.status(500).send(response.generate(false,' databse error occurred',500,null))
            }
            else if(check.isEmpty(result)){
                logger.error('No Requests','friendsController:getAllRequests()',1)
                res.send(response.generate(false,'No Requests',404,null))
            }
            else {
                logger.info('Requests sent successfully','friendsController:getAllRequests()',10)
                res.status(200).send(response.generate(false,'All Requests found',200,result))
            }
        })
    }else{
        logger.error('Invalid Request Parmaters','friendsController:getAllRequests()',1)
        res.status(400).send(response.generate(false,'Invalid Request Parameters',400,null))
    }
}

module.exports={
getAllRequests:getAllRequests
}