// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import { createRouter, createWebHistory } from 'vue-router';

import SearchView from '@/views/SearchView.vue';
import SettingsView from '@/views/SettingsView.vue';

const routes = [
    {
        path: '/',
        name: 'Search',
        component: SearchView,
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
