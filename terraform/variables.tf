variable "aws_region" {
  description = "AWS region to create resources in"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket to create"
  type        = string
  default     = "my-simple-node-app-bucket-12345"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "dev"
}
