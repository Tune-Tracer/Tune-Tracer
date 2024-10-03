import firebase from 'firebase/compat/app'
import 'firebase/compat/auth';
import "firebase/compat/database";
import 'firebase/compat/firestore';

import { DocumentMetadata } from '@lib/src/documentProperties';
import { Document } from '@lib/src/Document';
import { OnlineEntity, UpdateType } from '@lib/src/realtimeUserTypes';
import { AccessType, getDefaultUser, UserEntity } from '@lib/src/UserEntity';

import { 
    DOCUMENT_DATABASE_NAME, 
    FIREBASE_CONFIG, 
    SHARE_CODE_DATABASE,
    USER_DATABASE_NAME
} from '../firebaseSecrets'
import { ShareCodeEntity } from 'src/document-utils/sharing/ShareCodeEntity';

type PartialWithRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
type PartialWithRequiredAndWithout<T, K extends keyof T, U extends keyof T> = Partial<T> & Required<Omit<Pick<T, K>, U>>;

/*
    Wrapper class for doing firebase stuff
    Remember to call .initApp() before doing anything
    Note, all functions are async (except initApp), so any returns are promises
*/
export default class FirebaseWrapper
{
    public initApp(): void
    {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
    }

    public async setDataInFirestore(collection: string, documentId: string, data: Record<string, unknown>)
    {
        await firebase.firestore()
                .collection(collection)
                .doc(documentId)
                .set(data);
    }
    
    public async getDataFromFirestore<T>(collection: string, documentId: string): Promise<T | null>
    {
        const document = (await firebase.firestore()
            .collection(collection)
            .doc(documentId)
            .get());
        
        if(!document.exists)
        {
            return null;
        } 

        const data = document.data();
        if(data === null || data === undefined)
        {
            return null;
        }
        return data as T;
    }

    public async deleteDataFromFirestore(collection: string, documentId: string) {
        await firebase.firestore()
                .collection(collection)
                .doc(documentId)
                .delete();
    }

    public async doesDocumentExistInFirestore(collection: string, documentId: string)
    {
        return (await firebase.firestore()
                      .collection(collection)
                      .doc(documentId)
                      .get()).exists;
    }

    public async updateDataInFirestore(
        collection: string, 
        documentId: string, 
        updateObject: Record<string, unknown>
    ): Promise<boolean> {
        if(!await this.doesDocumentExistInFirestore(collection, documentId)) {
            throw Error(`Document in collection ${collection} with id ${documentId} does not exist`);
        }
    
        await firebase
                .firestore()
                .collection(collection)
                .doc(documentId)
                .update(updateObject);
        return true;
    }

    // creates an account for a user with the given email and password
    // will throw an Error if the account creation failed 
    // (see https://firebase.google.com/docs/auth/admin/errors for more details)
    public async signUpNewUser(email: string, password: string, displayName: string): Promise<boolean>
    {
        let user;
        try {
            // user sign up
            await firebase.auth().createUserWithEmailAndPassword(email, password);
            user = firebase.auth().currentUser;
            if(!user)
            {
                throw Error('Something went wrong with user signup. User is null');
            }
    
            // update username
            await user.updateProfile({
                displayName : displayName
            });

            const userEntity: UserEntity = getDefaultUser();
            userEntity.user_email = email;
            userEntity.display_name = displayName;
            userEntity.user_id = user.uid;

            await this.setUser(userEntity);

        } catch(error) {
            // if the account creation failed, make sure to remove all updates made to Firestore
            if(user) {
                await this.deleteDataFromFirestore(USER_DATABASE_NAME, user.uid);
                await user?.delete()
                            .catch( (deletionError) => {
                                console.log(
                                    `Another error occurred when attempted to delete the user data after the user account 
                                        failed to be created.\nDetails: ${deletionError.message}`
                            )});
            }
            
            // rethrow the error so that the error is passed along
            throw error;
        }

        return true;
    }

    // will throw an error on a failed sign in
    public async signInUser(email: string, password: string) : Promise<void>
    {
        await firebase.auth().signInWithEmailAndPassword(email, password);
    }

    public async doesDocumentExist(documentId: string): Promise<boolean>
    {
        return this.doesDocumentExistInFirestore(DOCUMENT_DATABASE_NAME, documentId);
    }

    public async doesUserExist(userId: string): Promise<boolean>
    {
        return this.doesDocumentExistInFirestore(USER_DATABASE_NAME, userId);
    }

    // creates a blank composition document and returns the id of the created document
    public async createDocument(): Promise<string>
    {
        const firestoreDocument = await firebase
            .firestore()
            .collection(DOCUMENT_DATABASE_NAME)
            .add({});
        return firestoreDocument.id;
    }

    // takes in the new document
    // returns true iff the document exists and the update was successful
    // UNUSED
    public async updateDocument(documentId: string, document: Document): Promise<boolean>
    {
        return this.updateDataInFirestore(DOCUMENT_DATABASE_NAME, documentId, document);
    }

    // updates somes field in a document
    // throws an error if the document does not exist
    public async updatePartialDocument(documentId: string, updateObject: Record<string, unknown>)
        : Promise<boolean>
    {
        const isSuccessful = await this.updateDataInFirestore(DOCUMENT_DATABASE_NAME, documentId, updateObject);
        if(!isSuccessful)
        {
            throw Error(`Document with id ${documentId} does not exist or update failed`);
        }
        return true;
    }

    // takes in the document unique id and returns the associated document as a JSON object
    // if the document or data doesn't exist, the function returns null
    public async getDocument(documentId: string): Promise<Document | null>
    {
        return this.getDataFromFirestore<Document>(DOCUMENT_DATABASE_NAME, documentId);
    }

    public async getDocumentField<T>(documentId: string, field: string): Promise<T | null> {
        const data = await this.getDocument(documentId);
        return data ? (data as any)[field] as T : null;
    }

    public async getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
       return await this.getDocumentField<DocumentMetadata>(documentId, "metadata");
    }
    
    // deletes the document associated with the documentId
    // throws an error if the document deletion was unsuccessful
    public async deleteDocument(documentId: string): Promise<void>
    {
        await firebase.firestore().collection(DOCUMENT_DATABASE_NAME).doc(documentId).delete();
    }

    public async getUser(userId: string): Promise<UserEntity> {
        const data = await this.getDataFromFirestore<UserEntity>(USER_DATABASE_NAME, userId);
        
        if(!data)
        {
            throw Error(`Could not find user ${userId} in database`);
        } 

        return data;
    }

    public async setUser(userEntity: UserEntity)
    {
        await this.setDataInFirestore(USER_DATABASE_NAME, userEntity.user_id, userEntity);
    }
    // gets the list of document ids of documents owned (if isOwned is true) or shared (is isOwned is false)
    // by a particular user
    public async getUserDocuments(userId: string, accessTypes: AccessType[]): Promise<string[]>
    {
        const data = await this.getDataFromFirestore<UserEntity>(USER_DATABASE_NAME, userId);
        if(!data)
        {
            return [];
        }

        let documentIds: string[] = [];

        for(const accessType of accessTypes)
        {
            const fieldName = `${accessType}_documents`;
            if(fieldName in data)
            {
                documentIds.push(...((data as any)[fieldName] as string[]));
            }
        }

        return documentIds;
    }

    // add a document to a list of documents that the user either owns or has access to
    // isOwned is true iff the userEmail is associated with the user that created the document
    // assumption: the user must not own the document if isOwned is set to false
    // will throw an Error if the user does not exist
    public async insertUserDocument(userId: string, documentId: string, accessType: AccessType): Promise<void>
    {
        if(!this.doesUserExist(userId))
        {
            throw Error(`Trying to share document ${documentId} with user ${userId}, but user does not exist`);
        }
        const fieldName = `${accessType}_documents`;
        const data = firebase.firestore.FieldValue.arrayUnion(documentId);
        const updatedObject = {[fieldName]: data};
        await this.updateDataInFirestore(USER_DATABASE_NAME, userId, updatedObject);
    }

    // delete a document from a list of documents that the user either owns or has access to
    // isOwned is true iff the userEmail is associated with the user that created the document
    public async deleteUserDocument(userId: string, documentId: string, accessType: AccessType): Promise<void>
    {
        const fieldName = `${accessType}_documents`;
        const data = firebase.firestore.FieldValue.arrayRemove(documentId);
        const updatedObject = {[fieldName]: data};
        await this.updateDataInFirestore(USER_DATABASE_NAME, userId, updatedObject);
    }

    public async updateUserLevelProperty(userId: string, documentId: string, property: string, value: unknown)
    {
        const updateObject = {
            [`preview_properties.${documentId}.${property}`]: value
        };
        await this.updateDataInFirestore(USER_DATABASE_NAME, userId, updateObject);
    }

    // NOT FOR EXTERNAL USE (use the subscription fn in documentOperations.ts instead)
    // wrapper for the document subscription
    public async subscribeToDocument(
        documentId: string, 
        onSnapshotFn: (snapshot: firebase.firestore.DocumentSnapshot) => void
    ){
        firebase.firestore()
                .collection(DOCUMENT_DATABASE_NAME)
                .doc(documentId)
                .onSnapshot(onSnapshotFn);
    }
    
    // registers a user to the "online" collection of a document's user
    public async registerUserToDocument(
        documentId: string, 
        user: {
            user_email: string, 
            user_id: string, 
            display_name: string
    }) {
        const userReference = firebase.database().ref(`/presence/${documentId}/users/${user.user_id}`);
        await userReference.set({
            user_id: user.user_id,
            user_email: user.user_email,
            display_name: user.display_name,
            last_active_time: firebase.database.ServerValue.TIMESTAMP
        });
        userReference.onDisconnect().remove();
    }

    // sets the user's last_active_time to "now" and can be used to edit info about an online user
    // TO DO: check if user is already registered to the document
    public async updateUserInDocument(
        documentId: string, 
        user: PartialWithRequiredAndWithout<OnlineEntity, 'user_id', 'last_active_time'>
    ) {
        const userReference = firebase.database().ref(`/presence/${documentId}/users/${user.user_id}`);
        const updates = {
            ...user,
            last_active_time: firebase.database.ServerValue.TIMESTAMP
        };
        await userReference.update(updates);
    }

    // triggers the callback function when an OnlineEntity is updated (changed, added, deleted)
    public async subscribeToOnlineUsers(
        documentId: string, 
        onlineUserUpdateFn: (updateType: UpdateType, user: OnlineEntity) => void
    ) {
        const presenceReference = firebase.database().ref(`/presence/${documentId}/users`);

        presenceReference.on('child_added', (snapshot) => {
            const user = snapshot.val();
            onlineUserUpdateFn(UpdateType.ADD, user);
        });

        presenceReference.on('child_removed', (snapshot) => {
            const user = snapshot.val();
            onlineUserUpdateFn(UpdateType.DELETE, user);
        });

        presenceReference.on('child_changed', (snapshot) => {
            const user = snapshot.val();
            onlineUserUpdateFn(UpdateType.CHANGE, user);
        });
    }

    public async getShareCodeEntity(shareCode: string): Promise<ShareCodeEntity | null>
    {
        return this.getDataFromFirestore(SHARE_CODE_DATABASE, shareCode);
    }

    public async setShareCodeEntity(shareCodeEntity: ShareCodeEntity)
    {
        return this.setDataInFirestore(SHARE_CODE_DATABASE, shareCodeEntity.code, shareCodeEntity);
    }

    public async deleteShareCodeEntity(shareCode: string)
    {
        return this.deleteDataFromFirestore(SHARE_CODE_DATABASE, shareCode);
    }
}