const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/documentController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/',    ctrl.list);
router.post('/',   [body('title').optional().trim().isLength({ max: 200 })], ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:id/collaborators',            ctrl.addCollaborator);
router.delete('/:id/collaborators/:userId',  ctrl.removeCollaborator);

router.get('/:id/versions',                  ctrl.getVersions);
router.post('/:id/restore/:versionId',       ctrl.restoreVersion);

module.exports = router;
