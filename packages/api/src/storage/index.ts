// NOT './cloudfront': it imports @aws-sdk/{client-cloudfront,cloudfront-signer},
// which no package.json declares and the lockfile does not carry. Re-exporting it
// here makes the whole barrel unrequireable at boot, and nothing in the server
// uses any CloudFront helper. Declare those two deps before exporting it.
export * from './s3';
export * from './types';
export * from './images';
export * from './avatar';
export * from './metadata';
