#!/usr/bin/env groovy
// vim: set ts=4 sts=4 sw=4 et:

// Items to synchronize into bucket
String[] items = [
    'index.html',
    'css/',
    'db/',
    'images/',
    'js/',
    'lang/',
]

// Standard LCO AWS S3 Bucket synchronization pipeline
s3BucketPipeline([
    awsCredentials: 'jenkins-publish-messierbingo.lco.global',
    s3Bucket: 'messierbingo.lco.global',
    items: items,
])
