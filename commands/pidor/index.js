const { title, description } = require('./about.json');
module.exports = {


	active: true,
	category: 'nsfw',


	name: 'poniyob',
	title: title,
	description: description,


	init: function () { return this; },


	call: function (int) {
		int.reply({
			content: '�����������!'
		})
		int.editReply({
			content: '�����...'
		})
		int.editReply({
			content: '� ������-�� � ���:'
		})
		int.followUp({
			content: int.guild.members.cache.random().tag + '!'
		})
	},

	/**
	 * ������� ��������� slash-�������.
	 * ���� ������� ���������� - �� ��� ������������� ����� ��������� ����-������� � ������� ������ � slashOptions, ���� ��� �������.
	 * @param {CommandInteraction} int
	 */
	slash: async function (int) { 
		await this.call(int);
	}
}