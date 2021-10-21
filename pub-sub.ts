type SimplePubSubListener<T> = (data: T) => void;

export default class EventStream<T> {
    private subscribers: Array<SimplePubSubListener<T>> = [];

    receive(listener: SimplePubSubListener<T>) {
        this.subscribers.push(listener);
    }

    send(data: T) {
        while (this.subscribers.length > 0) {
            this.subscribers.shift()(data);
        }
    }
}
