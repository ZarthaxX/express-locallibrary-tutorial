var debug = require('debug')('bookinstance');

var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {

    BookInstance.find()
      .populate('book')
      .exec(function (err, list_bookinstances) {
        if (err) { return next(err); }
        // Successful, so render
        res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
      });
      
  };

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance:  bookinstance});
    })

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {       

    Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books});
    });
    
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate fields.
    body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res) {
    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findById(req.params.id).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.bookinstance==null) { // No results.
            res.redirect('/catalog/bookinstances');
        }
        debug(results.bookinstance.id);
        // Successful, so render.
        res.render('bookinstance_delete', { title: 'Delete Book copy', bookinstance: results.bookinstance } );
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res) {
    async.parallel({
        bookinstance: function(callback) {
          BookInstance.findById(req.body.bookinstanceid).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err); }

        // Success
        BookInstance.findByIdAndRemove(req.body.bookinstanceid, function deleteBookInstance(err) {
            if (err) { return next(err); }
            // Success - go to author list
            debug("bookinstanceid : " + req.body.bookinstanceid);
            debug("bookinstance : " + results.bookinstance);
            res.redirect('/catalog/bookinstances');
        })
    
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res) {

    // Get book, authors and genres for form.
    async.parallel({
        book_list: function(callback) {
            Book.find(callback);
        },
        bookinstance: function(callback){
            BookInstance.findById(req.params.id).exec(callback);
        },
        }, function(err, results) {
            if (err) { return next(err); }
            if (results.bookinstance==null) { // No results.
                var err = new Error('Book Instance not found');
                err.status = 404;
                return next(err);
            }
            
            res.render('bookinstance_form', { title: 'Update Book', book_list : results.book_list, bookinstance: results.bookinstance });
        });

};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

    // Convert the genre to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },
   
    // Validate fields.
    body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var new_bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id:req.params.id
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            async.parallel({
                book_list: function(callback) {
                    Book.find(callback);
                },
                bookinstance: function(callback){
                    BookInstance.findById(req.params.id).exec(callback);
                },
                }, function(err, results) {
                    
                    if (err) { return next(err); }
                    if (results.bookinstance==null) { // No results.
                        var err = new Error('Book Instance not found');
                        err.status = 404;
                        return next(err);
                    }
                    
                    res.render('bookinstance_form', { title: 'Update book copy', book_list : results.book_list, bookinstance: results.bookinstance, errors: errors.array()  });
                });
                
            return;
        }
        else {
            
            // Data from form is valid. Update the record.
            BookInstance.findByIdAndUpdate(req.params.id, new_bookinstance, {}, function (err,new_bookinstance) {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
        console.log(new_bookinstance);
                   res.redirect(new_bookinstance.url);
                });
        }
    }
];
