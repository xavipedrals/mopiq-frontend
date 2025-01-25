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
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { getDeckTopicByValue, getAvatarImageName } from '../utils.js';

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
            const globalDeckData = await this.fetchGlobalSharedDeck(deckId);
            if (globalDeckData.error) {
                this.errorMessage = globalDeckData.error;
            } else {
                const userData = await this.fetchUserData(globalDeckData.ownerId);
                if (userData.error) {
                    this.errorMessage = userData.error;
                } else {
                    const deckData = await this.fetchLocalSharedDeck(globalDeckData.ownerId, globalDeckData.localDeckId);
                    if (deckData.error) {
                        this.errorMessage = deckData.error;
                    } else {
                        const topic = getDeckTopicByValue(deckData.category);
                        var sharedDeckInfo = deckData;
                        sharedDeckInfo.topic = topic;
                        this.authorInfo = {
                            avatarImg: getAvatarImageName(userData.avatarNumber),
                            name: userData.name,
                            imageStoragePath: userData.imageStoragePath
                        };
                        console.log(this.authorInfo);
                        sharedDeckInfo.topicImg = `/topics/${topic.imageName}.svg`;
                        var options = { year: 'numeric', month: 'long', day: 'numeric' };
                        // Ensure lastUpdate is either a Firestore Timestamp or a valid date string
                        if (sharedDeckInfo.lastUpdate && sharedDeckInfo.lastUpdate.toDate) {
                            // If lastUpdate is a Firestore Timestamp
                            sharedDeckInfo.dateStr = sharedDeckInfo.lastUpdate.toDate().toLocaleDateString("en-US", options);
                        } else if (sharedDeckInfo.lastUpdate instanceof Date) {
                            // If lastUpdate is already a JavaScript Date
                            sharedDeckInfo.dateStr = sharedDeckInfo.lastUpdate.toLocaleDateString("en-US", options);
                        } else if (typeof sharedDeckInfo.lastUpdate === 'string' || typeof sharedDeckInfo.lastUpdate === 'number') {
                            // If lastUpdate is a timestamp string or numeric value
                            const date = new Date(sharedDeckInfo.lastUpdate);
                            sharedDeckInfo.dateStr = date.toLocaleDateString("en-US", options);
                        } else {
                            console.error("Invalid lastUpdate value:", sharedDeckInfo.lastUpdate);
                            sharedDeckInfo.dateStr = "Invalid date";
                        }
                        if (userData.imageStoragePath != null && userData.imageStoragePath !== '') {
                            this.fetchImage(userData.imageStoragePath);
                        }
                        this.sharedDeckInfo = sharedDeckInfo;
                    }
                }
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