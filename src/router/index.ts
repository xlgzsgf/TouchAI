// Copyright (c) 2026. 千诚. Licensed under GPL v3.

import { createRouter, createWebHistory } from 'vue-router';

import PopupView from '@/views/PopupView.vue';
import SearchView from '@/views/SearchView.vue';
import SettingsView from '@/views/SettingsView.vue';
import TrayView from '@/views/TrayView.vue';

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
    {
        path: '/tray-menu',
        name: 'TrayMenu',
        component: TrayView,
    },
    {
        path: '/popup',
        name: 'Popup',
        component: PopupView,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
