const Blog = require('../models/blog');
const Category = require('../models/category');
const Tag = require('../models/tag');
const formidable = require('formidable'); //get form data 
const slugify = require('slugify');

const _ = require('lodash'); //to update the blogs
const { errorHandler } = require('../helpers/dbErrorHandler');
const fs = require('fs');
const {stripHtml} = require('string-strip-html');  //to get html content sot hat we can create the excerpts, meta descs and etc..
const {smartTrim} = require('../helpers/blog'); 

exports.create = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Image could not upload'
            });
        }

        const { title, body, categories, tags } = fields;

        if(!title || !title.length){
            return res.status(400).json({
                error: 'title is required'
            })
        }

        
        if(!body || body.length<200){
            return res.status(400).json({
                error: 'Content is too short.'
            })
        }

        
        if(!categories || categories.length === 0){
            return res.status(400).json({
                error: 'Atleast 1 category is required'
            })
        }

        
        if(!tags || !tags.length){
            return res.status(400).json({
                error: 'Atleast 1 tag is required'
            })
        }

        let blog = new Blog();
        blog.title = title;
        blog.body = body;
        // blog.postedBy = req.auth._id;
        blog.excerpt = smartTrim(body, 320, ' ', '...');
        blog.slug = slugify(title).toLowerCase();
        blog.mtitle = `${title} | ${process.env.APP_NAME}`;
        blog.mdesc = stripHtml(body.substring(0, 160)).result;
        

        //categories and tags 

        let arrayOfCategories = categories && categories.split(',');
        let arrayOfTags = tags && tags.split(',');

        if (files.photo) {
            if (files.photo.size > 10000000) {
                return res.status(400).json({
                    error: 'Image should be less then 1mb in size'
                });
            }
            blog.photo.data = fs.readFileSync(files.photo.path);
            blog.photo.contentType = files.photo.type;
        }

        blog.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
           // res.json(result);

           //we will use the blog Id now that it has been saved and we are going to find the blog one more time form the DB and we are going to push thecat and tags to it
           Blog.findByIdAndUpdate(result._id, {$push: {categories: arrayOfCategories}}, {new:true}).exec((err, result) => {
                if(err){
                    return res.status(400).json({
                        error: errorHandler(err),
                    })
                }else{
                    Blog.findByIdAndUpdate(result._id, {$push:{tags: arrayOfTags}}, {new:true}).exec((err,result) => {
                        if(err){
                            return res.status(400).json({
                                error: errorHandler(err),
                            })
                        }else{
                            return res.json(result);
                        }
                    })
                }
           });
        });
    });
};


exports.list = (req,res) => {
    Blog.find({})
    .populate('categories', '_id name slug') //this is used to populate 'categories' as it is there in our blog shcmea 
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
    .exec((err,data)=>{
        if(err){
            return  res.json({
                error: errorHandler(err)
            })
        }
        res.json(data);
    })
}


exports.listAllBlogsCategoriesTags = (req,res) => {
    let limit = req.body.limit ? parseInt(req.body.limit) : 10;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    let blogs;
    let categories;
    let tags;

    Blog.find({})
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            blogs = data; // blogs
            // get all categories
            Category.find({}).exec((err, c) => {
                if (err) {
                    return res.json({
                        error: errorHandler(err)
                    });
                }
                categories = c; // categories
                // get all tags
                Tag.find({}).exec((err, t) => {
                    if (err) {
                        return res.json({
                            error: errorHandler(err)
                        });
                    }
                    tags = t;
                    // return all blogs categories tags
                    res.json({ blogs, categories, tags, size: blogs.length });
                });
            });
        });
}


exports.read = (req,res) => {
    const slug = req.params.slug.toLowerCase();
    Blog.findOne({ slug })
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username')
        .select('_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            res.json(data);
        });
}


exports.remove = (req, res) => {
    const slug = req.params.slug.toLowerCase();
    Blog.findOneAndRemove({ slug }).exec((err, data) => {
        if (err) {
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json({
            message: 'Blog deleted successfully'
        });
    });
};





exports.update = (req, res) => {
    const slug = req.params.slug.toLowerCase();

    Blog.findOne({ slug }).exec((err, oldBlog) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }

        let form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(400).json({
                    error: 'Image could not upload'
                });
            }

            let slugBeforeMerge = oldBlog.slug;
            oldBlog = _.merge(oldBlog, fields);
            oldBlog.slug = slugBeforeMerge;

            const { body, desc, categories, tags } = fields;

            if (body) {
                oldBlog.excerpt = smartTrim(body, 320, ' ', ' ...');
                oldBlog.desc = stripHtml(body.substring(0, 160)).result;
            }

            if (categories) {
                oldBlog.categories = categories.split(',');
            }

            if (tags) {
                oldBlog.tags = tags.split(',');
            }

            if (files.photo) {
                if (files.photo.size > 10000000) {
                    return res.status(400).json({
                        error: 'Image should be less then 1mb in size'
                    });
                }
                oldBlog.photo.data = fs.readFileSync(files.photo.path);
                oldBlog.photo.contentType = files.photo.type;
            }

            oldBlog.save((err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                // result.photo = undefined;
                res.json(result);
            });
        });
    });
};



exports.photo = (req, res) => {
    const slug = req.params.slug.toLowerCase();
    Blog.findOne({ slug })
        .select('photo')
        .exec((err, blog) => {
            if (err || !blog) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.set('Content-Type', blog.photo.contentType);
            return res.send(blog.photo.data);
        });
};


exports.listRelated = (req, res) => {
    let limit = req.body.limit ? parseInt(req.body.limit) : 3;
    const { _id, categories } = req.body.blog;

    Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
        .limit(limit)
        .populate('postedBy', '_id name profile')
        .select('title slug excerpt postedBy createdAt updatedAt')
        .exec((err, blogs) => {
            if (err) {
                return res.status(400).json({
                    error: 'Blogs not found'
                });
            }
            res.json(blogs);
        });
};

exports.listSearch = (req, res) => {
    const { search } = req.query;
    if (search) {
        Blog.find(
            {
                $or: [{ title: { $regex: search, $options: 'i' } }, { body: { $regex: search, $options: 'i' } }]
            },
            (err, blogs) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(blogs);
            }
        ).select('-photo -body');
    }
};