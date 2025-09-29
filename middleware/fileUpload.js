const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const hasS3Config = Boolean(
    process.env.AWS_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
);

let storage;

if (hasS3Config) {
    aws.config.update({
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        region: process.env.AWS_REGION
    });

    const s3 = new aws.S3();

    storage = multerS3({
        s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    });
} else {
    console.warn('S3 upload disabled: missing AWS configuration. Falling back to memory storage.');
    storage = multer.memoryStorage();
}

module.exports = multer({ storage });