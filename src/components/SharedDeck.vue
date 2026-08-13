<template>
    <div class="container-md">
        <p v-if="loading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="sharedDeckInfo.isShared === false">The deck is no longer being shared</p>
        <div class="deck-container" v-else>
            <div class="header-container">
                <div>
                    <div class="topic-text" :style="{ color: sharedDeckInfo.topic.color }">{{ sharedDeckInfo.topic.name.toUpperCase() }}</div>
                    <h1>{{ sharedDeckInfo.name }}</h1>
                    <div class="cards-container">
                        <img src="/cards.svg"/>{{ sharedDeckInfo.cardsCount }} cards
                    </div>
                </div>
                <div class="topic-container" :style="{ background: sharedDeckInfo.topic.backgroundColor }">
                    <img :src="sharedDeckInfo.topicImg"/>
                </div>
            </div>
            <div class="author-container">
                <div class="img-background">
                    <img v-if="authorInfo.imageStoragePath && authorInfo.imageStoragePath !== ''" :src="userImageUrl" alt="avatar"/>
                    <img v-else :src="authorInfo.avatarImg" alt="avatar"/>
                </div>
                <div class="text-container">
                    <div>Shared by</div>
                    <div class="author-name">{{ authorInfo.name }}</div>
                </div>
            </div>
            <div class="calendar-container">
                <img src="/calendar.svg"/>Shared on {{ sharedDeckInfo.dateStr }}
            </div>
            <!-- <a href="https://apps.apple.com/in/app/anki-flashcards-study-decks/id6443485322" target="_blank" style="text-decoration: none;">
                <button class="download-button">Add deck</button>
            </a> -->
            <!-- <a href="#" @click.prevent="openDeeplink" style="text-decoration: none;"> -->
                <button @click="openDeeplink(sharedDeckInfo.globalId)" class="download-button">Add deck</button>
            <!-- </a> -->
            <p class="bottomText">If you don’t have the app installed download it <a href="https://apps.apple.com/app/anki-flashcards-study-decks/id6443485322" target="_blank">here</a>.</p>
        </div>
    </div>
</template>

<style scoped>

.container-md {
    display: flex;
    justify-content: center;
    min-height: 90vh;
    align-items: center; /* Vertical alignment */
    justify-content: center; /* Horizontal alignment, if needed */
}
.deck-container {
    background: #ffffff;
    box-shadow: 0 6px 20px 0 #CBD5E1;
    border-radius: 20px;
    padding: 32px;
    margin: 40px 0;
    width: 700px;
}
.header-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 32px;
}
.header-container h1 {
    font-size: 2.6em;
    font-weight: 700;
    margin-bottom: 18px;
}
.topic-text {
    font-size: 1.2em;
    font-weight: 800;
    margin-bottom: 8px;
}
.topic-container {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    display: flex;
    padding: 18px;
    margin-left: 32px;
}
.cards-container {
    display: flex;
    align-items: center; /* Vertical alignment */
    font-size: 1.15em;
    color: #64748B;
}
.cards-container img {
    margin-right: 12px;
}
.author-container {
    background: #F1F5F9;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
}
.author-container img {
    width: 80px;
    height: 80px;
    border-radius: 40px;
}
.author-container .img-background {
    width: 80px;
    height: 80px;
    border-radius: 40px;
    background-color: #CBD5E1;
}
.text-container {
    padding: 0 30px;
}
.text-container {
    display: flex;
    flex-direction: column;
    align-content: center;
    font-size: 1.15em;
    color: #64748B;
}
.text-container .author-name {
    font-size: 1.3em;
    color: #334155;
}
.download-button {
    font-size: 1.5em !important;
    font-weight: 300;
    /* padding: 15px 30px; */
    width: 100%;
    height: 80px;
    cursor: pointer;
    border-radius: 14px !important;
}
.calendar-container {
    display: flex;
    align-items: center; /* Vertical alignment */
    font-size: 1.15em;
    color: #64748B;
    margin-top: 32px;
    margin-bottom: 70px;
}
.calendar-container img {
    margin-right: 12px;
}
.bottomText {
    font-size: 1em;
    color: #64748B;
    margin-top: 18px;
    text-align: center;
}
@media (max-width: 576px) {
    .deck-container {
        width: 100%;
        padding: 24px;
        margin: 10px 0 30px 0;
    }
    .header-container {
        margin-top: 12px;
        margin-bottom: 24px;
    }
    .header-container h1 {
        font-size: 1.8em;
        font-weight: 700;
    }
    .topic-text {
        font-size: 1em;
    }
    .topic-container {
        width: 70px !important;
        height: 70px !important;
        border-radius: 14px;
        padding: 16px;
        margin-left: 18px;
    }
    .cards-container {
        font-size: 1em;
    }
    .author-container {
        border-radius: 18px;
        padding: 14px;
    }
    .author-container img {
        width: 64px;
        height: 64px;
        border-radius: 32px;
    }
    .author-container .img-background {
        width: 64px;
        height: 64px;
        border-radius: 32px;
    }
    .text-container {
        padding: 0 18px;
    }
    .text-container {
        font-size: 1em;
    }
    .text-container .author-name {
        font-size: 1.2em;
    }
    .calendar-container {
        margin-top: 32px;
        margin-bottom: 48px;
    }
    .download-button {
        font-size: 1.3em !important;
        font-weight: 400;
        height: 72px;
    }
    .bottomText {
        font-size: 0.9em;
    }
}
</style>

<script>
import { db, storage } from '@/firebaseInit';
import { supabaseAnonKey, supabaseUrl } from '@/supabaseInit';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import {
    getAvatarImageName,
    getDeckTopicByPostgresId,
    getDeckTopicByValue,
    looksLikePostgresSnapshotId
} from '../utils.js';

export default {
    name: 'SharedDeck',
    data() {
        return {
            sharedDeckInfo: null,
            authorInfo: null,
            loading: true,
            errorMessage: '',
            userImageUrl: '/avatar/avatar-placeholder.svg'
        };
    },
    async beforeMount() {
        this.loading = true;
        const deckId = this.$route.params.globalDeckId;
        try {
            if (looksLikePostgresSnapshotId(deckId)) {
                await this.loadPostgresSharedDeck(deckId);
            } else {
                await this.loadFirebaseSharedDeck(deckId);
            }
        }
        catch(error) {
            console.error("Failed to fetch document:", error);
            this.errorMessage = 'Failed to load deck information';
        } finally {
            this.loading = false;
        }
    },
    methods: {
        presentSharedDeck({ deck, topic, lastUpdate, author }) {
            const sharedDeckInfo = deck;
            sharedDeckInfo.topic = topic;
            sharedDeckInfo.topicImg = `/topics/${topic.imageName}.svg`;
            this.authorInfo = author;
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            if (lastUpdate && lastUpdate.toDate) {
                sharedDeckInfo.dateStr = lastUpdate.toDate().toLocaleDateString("en-US", options);
            } else if (lastUpdate instanceof Date) {
                sharedDeckInfo.dateStr = lastUpdate.toLocaleDateString("en-US", options);
            } else if (typeof lastUpdate === 'string' || typeof lastUpdate === 'number') {
                sharedDeckInfo.dateStr = new Date(lastUpdate).toLocaleDateString("en-US", options);
            } else {
                console.error("Invalid lastUpdate value:", lastUpdate);
                sharedDeckInfo.dateStr = "Invalid date";
            }
            if (author.imageStoragePath) {
                this.fetchImage(author.imageStoragePath);
            }
            this.sharedDeckInfo = sharedDeckInfo;
        },
        async loadPostgresSharedDeck(snapshotId) {
            const row = await this.fetchPostgresSharedDeck(snapshotId);
            if (row.error) {
                this.errorMessage = row.error;
                return;
            }
            if (!row) {
                this.errorMessage = 'Global deck not found';
                return;
            }
            const topic = getDeckTopicByPostgresId(row.topic);
            this.presentSharedDeck({
                deck: {
                    name: row.name,
                    cardsCount: row.card_count,
                    isShared: true,
                    globalId: row.id
                },
                topic,
                lastUpdate: row.updated_at || row.created_at,
                author: {
                    avatarImg: getAvatarImageName(row.author?.avatar_number || 0),
                    name: row.author?.name || 'Anki user',
                    imageStoragePath: row.author?.image_storage_path || ''
                }
            });
        },
        async loadFirebaseSharedDeck(deckId) {
            const globalDeckData = await this.fetchGlobalSharedDeck(deckId);
            if (globalDeckData.error) {
                this.errorMessage = globalDeckData.error;
                return;
            }
            const userData = await this.fetchUserData(globalDeckData.ownerId);
            if (userData.error) {
                this.errorMessage = userData.error;
                return;
            }
            const deckData = await this.fetchLocalSharedDeck(globalDeckData.ownerId, globalDeckData.localDeckId);
            if (deckData.error) {
                this.errorMessage = deckData.error;
                return;
            }
            this.presentSharedDeck({
                deck: deckData,
                topic: getDeckTopicByValue(deckData.category),
                lastUpdate: deckData.lastUpdate,
                author: {
                    avatarImg: getAvatarImageName(userData.avatarNumber),
                    name: userData.name,
                    imageStoragePath: userData.imageStoragePath
                }
            });
        },
        fetchImage(path) {
            const pathReference = ref(storage, path);
            getDownloadURL(pathReference)
            .then((url) => {
                this.userImageUrl = url;
            })
            .catch((error) => {
                console.error("Error fetching image:", error);
            });
        },
        openDeeplink(globalId) {
            //There is no reliable way to check if the app was installed right now
            const appLink = `ankicards://shared/${globalId}`; // Replace with your actual deeplink
            // const appStoreLink = "https://apps.apple.com/in/app/anki-flashcards-study-decks/id6443485322"; // App Store link
            window.location = appLink;
        },
        async fetchPostgresSharedDeck(snapshotId) {
            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_shared_deck_public`, {
                    method: 'POST',
                    headers: {
                        apikey: supabaseAnonKey,
                        Authorization: `Bearer ${supabaseAnonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ p_snapshot_id: snapshotId })
                });
                if (!response.ok) {
                    const detail = await response.text();
                    console.error('Error fetching postgres shared deck:', detail);
                    return { error: 'Failed to load deck information' };
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching postgres shared deck:', error);
                return { error: error.message };
            }
        },
        async fetchGlobalSharedDeck(globalId) {
            const globalDeckRef = doc(db, 'shared-decks', globalId);
            try {
                const globalDeckSnap = await getDoc(globalDeckRef);
                if (globalDeckSnap.exists()) {
                    return globalDeckSnap.data();
                } else {
                    console.error("Global deck not found");
                    return { error: "Global deck not found" };
                }
            } catch(error) {
                console.error("Error fetching global deck info:", error);
                return { error: error.message };
            }
        },
        async fetchUserData(userId) {
            const userRef = doc(db, 'users', userId);
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    return userSnap.data();
                } else {
                    console.error("User not found");
                    return { error: "User not found" };
                }
            } catch(error) {
                console.error("Error fetching shared deck info:", error);
                return { error: error.message };
            }
        },
        async fetchLocalSharedDeck(userId, localDeckId) {
            const localDeckPath = `users/${userId}/sharedDecks/${localDeckId}`;
            const localDeckRef = doc(db, localDeckPath);
            try {
                const localDeckSnap = await getDoc(localDeckRef);
                if (localDeckSnap.exists()) {
                    return localDeckSnap.data();
                } else {
                    console.error("Local deck not found");
                    return { error: "Local deck not found" };
                }
            } catch(error) {
                console.error("Error fetching local shared deck info:", error);
                return { error: error.message };
            }
        }
    }
};

</script>