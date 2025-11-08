
interface ConfirmModalProps {
	open: boolean;
	onCancel: () => void;
	onConfirm: () => Promise<void>;
	title: string;
	message: string;
}

const ConfirmModal = (props: ConfirmModalProps) => <div>ConfirmModal Stub</div>;
export default ConfirmModal;
