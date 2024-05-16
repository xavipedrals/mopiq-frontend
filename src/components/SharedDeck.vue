<template>
    <div class="container-md">
        <p v-if="loading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
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
                    <img v-if="sharedDeckInfo.author.showImage && sharedDeckInfo.author.imageStoragePath !== ''" :src="userImageUrl" alt="avatar"/>
                    <img v-else-if="sharedDeckInfo.author.showImage && sharedDeckInfo.author.imageStoragePath === null" :src="sharedDeckInfo.avatarImg" alt="avatar"/>
                    <img v-else :src="randomAvatar" alt="avatar"/>
                </div>
                <div class="text-container">
                    <div>Shared by</div>
                    <div v-if="sharedDeckInfo.author.showName" class="author-name">{{ sharedDeckInfo.author.name }}</div>
                    <div v-else class="author-name">Anonymous user</div>
                </div>
            </div>
            <div class="calendar-container">
                <img src="/calendar.svg"/>Shared on {{ sharedDeckInfo.dateStr }}
            </div>
            <a href="https://apps.apple.com/in/app/anki-flashcards-study-decks/id6443485322" target="_blank" style="text-decoration: none;">
                <button class="download-button">Add deck</button>
            </a>
        </div>
    </div>
</template>

<style scoped>

.container-md {
    display: flex;
    justify-content: center;
    min-height: 100vh;
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
        font-size: 2em;
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
    
    .download-button {
        font-size: 1.3em !important;
        font-weight: 400;
        height: 72px;
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
            loading: true,
            errorMessage: '',
            randomAvatar: '',
            userImageUrl: '/avatar/avatar-placeholder.svg'
        };
    },
    async beforeMount() {
        this.loading = true;
        const deckId = this.$route.params.globalDeckId;
        const globalRef = doc(db, 'shared-decks', deckId);
        try {
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
                const deckData = globalSnap.data();
                const topic = getDeckTopicByValue(deckData.category);
                var sharedDeckInfo = deckData;
                sharedDeckInfo.topic = topic;
                sharedDeckInfo.avatarImg = getAvatarImageName(deckData.author.avatarNumber);
                sharedDeckInfo.topicImg = `/topics/${topic.imageName}.svg`;
                var options = { year: 'numeric', month: 'long', day: 'numeric' };
                sharedDeckInfo.dateStr = sharedDeckInfo.lastUpdate.toDate().toLocaleDateString("en-US", options);
                this.randomAvatar = getAvatarImageName(Math.floor(Math.random() * 101));
                if (sharedDeckInfo.author.imageStoragePath != null) {
                    this.fetchImage(sharedDeckInfo.author.imageStoragePath);
                }
                this.sharedDeckInfo = sharedDeckInfo;
            } else {
                this.errorMessage = 'Deck not found';
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
        }
    }
};

</script>