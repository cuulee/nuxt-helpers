/**
 * User store
 * Keeps logged-in user's state
 */

import Cookie from 'cookie';
import Cookies from 'js-cookie';
import {setToken, $get, $post} from '../plugins/axios';

const inBrowser = typeof window !== 'undefined';
const SSR = global.__VUE_SSR_CONTEXT__;

function AuthStore(opts) {
    const self = this;
    opts = opts || {};

    // ----------------------------------------
    // Default State
    // ----------------------------------------
    this.defaultState = {
        user: Object.assign({roles: [], name: null}, opts.default_user),
        loggedIn: false,
        token: null
    };

    // ----------------------------------------
    // State
    // ----------------------------------------
    this.state = Object.assign({}, self.defaultState);

    // ----------------------------------------
    // Getters
    // ----------------------------------------
    this.getters = {};

    // ----------------------------------------
    // Mutations
    // ----------------------------------------
    this.mutations = {

        setUser: function (state, user) {
            // Fill user with defaults data
            state.user = Object.assign({}, self.defaultState.user, user);

            // Set actual loggedIn status
            state.loggedIn = Boolean(user);
        },

        setToken: function (state, token) {
            state.token = token;

            // Setup axios
            setToken(token);

            // Store token in cookies
            if (inBrowser) {
                if (!token) {
                    return Cookies.remove('name', opts.token_cookie);
                }
                Cookies.set('token', token, opts.token_cookie);
            }
        }

    };

    // ----------------------------------------
    // Actions
    // ----------------------------------------
    this.actions = {

        loadToken: function (ctx) {
            // Try to extract token from cookies
            const cookieStr = inBrowser ? document.cookie : SSR.req.headers.cookie;
            const cookies = Cookie.parse(cookieStr || '') || {};
            const token = cookies.token;

            ctx.commit('setToken', token);
        },

        fetch: function (ctx) {
            // Load user token
            ctx.dispatch('loadToken');

            // No token
            if (!ctx.state.token) {
                return;
            }

            // Get user profile
            return $get('/auth/user').then(function (userData) {
                ctx.commit('setUser', userData.user);
            }).catch(function () {
                return ctx.dispatch('logout')
            });
        },

        login: function (ctx, fields) {
            return $post('/auth/login', fields).then(function (tokenData) {
                ctx.commit('setToken', tokenData.id_token);
                return ctx.dispatch('fetch');
            });
        },

        logout: function (ctx) {
            // Unload user profile
            ctx.commit('setUser', null);

            // Server side logout
            return $get('/auth/logout').then(function () {
                // Unset token
                ctx.commit('setToken', null);
            }).catch(function () {
                // Unset token
                ctx.commit('setToken', null);
            });
        }
    };
}

export default AuthStore;

