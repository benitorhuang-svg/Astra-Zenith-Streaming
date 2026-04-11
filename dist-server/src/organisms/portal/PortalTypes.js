"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIRTY_ALL = exports.DIRTY_WELCOME = exports.DIRTY_CONTENT = exports.DIRTY_SIDEBAR = void 0;
exports.DIRTY_SIDEBAR = 1 << 0;
exports.DIRTY_CONTENT = 1 << 1;
exports.DIRTY_WELCOME = 1 << 2;
exports.DIRTY_ALL = exports.DIRTY_SIDEBAR | exports.DIRTY_CONTENT | exports.DIRTY_WELCOME;
