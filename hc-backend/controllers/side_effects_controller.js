const SideEffects = require('../models/side_effects')
    , SideEffectsService = require('./../services/side_effects_service').SideEffectsService
    , sideEffectsService = new SideEffectsService()
    , errors = require('./../errors/errors');
/**
 * GET /api/side-effects
 */
exports.sideEffectsList = (req, res) => {
    sideEffectsService.readAll(SideEffects, req)
        .then(result => {
            res.json(result);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        })
};

/**
 * GET /api/side-effects/:id
 */
exports.sideEffectsRead = (req, res) => {
    sideEffectsService.readById(SideEffects, req)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * POST /api/side-effects
 * Create side-effects
 */
exports.sideEffectsCreate = (req, res) => {
    sideEffectsService.create(SideEffects, req)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * PUT /api/side-effects/:id
 * Update side-effects.
 */
exports.sideEffectsUpdate = (req, res) => {
    sideEffectsService.update(SideEffects, req)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * DELETE /api/side-effects/:id
 * remove side-effects
 */
exports.sideEffectsDelete = (req, res) => {
    sideEffectsService.deleteById(SideEffects, req)
        .then(response => {
            res.send(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        })
};

