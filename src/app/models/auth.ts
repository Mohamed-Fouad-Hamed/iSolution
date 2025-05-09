export interface ISignup{
    accountId:string;
    firstName:string;
    lastName:string;
    email:string;
    login:string;
    password:string;
    s_cut:string;
    phone:string;
}

export interface IAccountSignup{
    account_type:number;
    account_name:string;
    firstName:string;
    lastName:string;
    email:string;
    login:string;
    password:string;
    s_cut:string;
    phone?:string;
}

export interface ICredential{
    login:string;
    password:string;
    rememberMe:boolean;
}

export interface ITokenLogin{
    token:string | Blob;
}

export interface ILogin{
    login:string;
}

export interface IUniqueLogin{
    id:string;
}

export interface IVerifyOTP{
    login:string;
    otp:string;
}

export interface INewPassword{
    login:string;
    password:string;
}

export interface IUserResponse{
    id:number  ;
    firstName:string;
    lastName:string;
    email:string;
    login:string;
    s_cut:string;
    token:string;
    user_avatar:string | undefined;
    user_image:string | undefined;
    isOtpRequired:boolean;
    account_id:number;
    account_name:string;
    account_logo:string;
    account_image:string;
    account_type:string;
}