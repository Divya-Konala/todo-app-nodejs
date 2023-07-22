const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const userSchema = new Schema({
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        unique:true,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    username:{
        type:String,
        unique: true,
        require:true
    },
    telephone:{
        type:String,
        require:false
    }
})

module.exports = mongoose.model('user',userSchema);