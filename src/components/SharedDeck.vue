<template>
    <div>
        <h1>Deck Information</h1>
        <p v-if="loading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <div class="deck-container" v-else>
            <p :style="{ color: sharedDeckInfo.topic.color }">{{ sharedDeckInfo.topic.name.toUpperCase() }}</p>
            <h1>{{ sharedDeckInfo.name }}</h1>
            <p>Cards: {{ sharedDeckInfo.cardsCount }}</p>
            <p>AuthorName: {{ sharedDeckInfo.author.name }}</p>
            <p>showName: {{ sharedDeckInfo.author.showName }}</p>
            <img :src="sharedDeckInfo.avatarImg" alt="avatar"/>
        </div>
    </div>
</template>

<style>
.deck-container {
    background: #ffffff;
    box-shadow: 0 6px 20px 0 #CBD5E1;
    border-radius: 20px;
    padding: 32px;
}
</style>

<script>
import db from '@/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';
import { getDeckTopicByValue, getAvatarImageName } from '../utils.js';

export default {
    name: 'SharedDeck',
    data() {
        return {
            sharedDeckInfo: null,
            loading: true,
            errorMessage: ''
        };
    },
    async beforeMount() {
        this.loading = true;
        const deckId = this.$route.params.globalDeckId;
        const globalRef = doc(db, 'shared-decks', deckId);
        try {
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
                const globalDeckInfo = globalSnap.data();
                const deckRef = doc(db, `users/${globalDeckInfo.userId}/sharedDecks/${globalDeckInfo.deckId}`);
                const deckSnap = await getDoc(deckRef);
                if (deckSnap.exists()) {
                    const deckData = deckSnap.data();
                    const topic = getDeckTopicByValue(deckData.category);
                    var sharedDeckInfo = deckData;
                    sharedDeckInfo.topic = topic;
                    sharedDeckInfo.avatarImg = getAvatarImageName(deckData.author.avatarNumber);
                    this.sharedDeckInfo = sharedDeckInfo;
                } else {
                    this.errorMessage = 'Deck not found 2';
                } 
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
    }
};

</script>