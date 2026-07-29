import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    credits:{
        type:Number,
        default:1000
    },
    role:{
        type:String,
        enum:["employee","admin","superadmin"],
        default:"employee"
    },
    organizationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organization",
        default:null
    },
    active:{
        type:Boolean,
        default:true
    }

}, {timestamps:true})

const User = mongoose.model("User" , userSchema)

export default User
