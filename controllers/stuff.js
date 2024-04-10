const Thing = require('../models/thing');
const fs = require('fs');

exports.getAllThings = (req, res, next) => {
   Thing.find().then(
     (things) => {
        res.status(200).json(things);
     }
   ).catch(
     (error) => {
        res.status(400).json({
           error: error
        });
     }
   );
};

exports.bestRatings = (req, res, next) => {
   Thing.find().sort({'averageRating': 'desc'}).limit(3).then(
     (things) => {
        res.status(200).json(things);
     }
   ).catch(
     (error) => {
        res.status(400).json({
           error: error
        });
     }
   );
}

exports.getOneThing = (req, res, next) => {
   Thing.findOne({
      _id: req.params.id
   }).then(
     (thing) => {
        res.status(200).json(thing);
     }
   ).catch(
     (error) => {
        res.status(404).json({
           error: error
        });
     }
   );
};

exports.createThing = (req, res, next) => {
   const thingObject = JSON.parse(req.body.book);
   delete thingObject.userId;
   if (parseInt(thingObject.year)) {
      const thing = new Thing({
         ...thingObject,
         userId: req.auth.userId,
         imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
      });
      thing.save()
      .then(() => {
         res.status(201).json({message: 'Objet enregistré !'})
      })
      .catch(
        (error) => {
           res.status(500).json({
              error: error
           });
        })
   }
   ;
};

exports.modifyThing = (req, res, next) => {
   const thingObject = req.file
     ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
     }
     : {...req.body};
   delete thingObject._userId;
   
   Thing.findOne({_id: req.params.id})
   .then((thing) => {
      const oldImagePath = thing.imageUrl.replace(
        `${req.protocol}://${req.get("host")}/`,
        ""
      );
      if (thing.userId != req.auth.userId) {
         res.status(401).json({message: 'Not authorized'});
      } else {
         Thing.updateOne({_id: req.params.id}, {...thingObject, _id: req.params.id})
         .then(() => {
            if (req.file && oldImagePath) {
               fs.unlinkSync(oldImagePath)
            }
            
            res.status(200).json({message: 'Objet modifié!'});
         })
         .catch((error) => {
            console.log(error)
            res.status(401).json({error});
         });
      }
   })
   .catch((error) => {
      res.status(400).json({error});
   });
};

exports.rateThing = (req, res, next) => {
   if (req.body.rating < 0 || req.body.rating > 5) {
      return res.status(400).json({message: 'La note doit être comprise entre 0 et 5.'})
   }
   Thing.findOne({
      _id: req.params.id
   }).then(
     (thing) => {
        let alreadyRated = false;
        let total = 0;
        thing.ratings.forEach(rating => {
           total += rating.grade;
           if (thing.userId == req.auth.userId) {
              alreadyRated = true;
           }
        })
        if (alreadyRated) {
           return res.status(401).json({message: 'Vous avez déjà noté ce livre.'});
        }
        total += req.body.rating;
        let averageRating = total / (thing.ratings.length + 1);
        const newRating = {userId: req.auth.userId, grade: req.body.rating};
        Thing.findByIdAndUpdate({_id: thing._id}, {
           averageRating: averageRating,
           _id: req.params.id,
           $push: {ratings: newRating}
        }, {new: true})
        .then((thingUpdated) => {
           res.status(200).json(thingUpdated);
        })
        .catch((error) => {
           res.status(401).json({error});
        });
     })
   
};

exports.deleteThing = (req, res, next) => {
   Thing.findOne({_id: req.params.id})
   .then(thing => {
      if (thing.userId != req.auth.userId) {
         res.status(401).json({message: 'Not authorized'});
      } else {
         const filename = thing.imageUrl.split('/images/')[1];
         fs.unlink(`images/${filename}`, () => {
            Thing.deleteOne({_id: req.params.id})
            .then(() => {
               res.status(200).json({message: 'Objet supprimé !'})
            })
            .catch(error => res.status(401).json({error}));
         });
      }
   })
   .catch(error => {
      res.status(500).json({error});
   });
};