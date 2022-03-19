module.exports = {

	active : true,
	name : 'poll',
	title : 'Опросы',
	descriptionShort : 'Позволяет создавать общие и модераторские опросы',
	category : 'Утилиты',

	FLAGS : {
		POLLS: {
			PRIVATE: 1,
			PUBLIC: 2,
			CLOSED: 4,
		},
		ANSWERS: {
			DISAGREE: 1,
			SPAM: 2,
		}
	},

	slashOptions : [
		{
			name : 'common',
			description : 'Общий опрос',
			type : 1,
			options : [
				{
					name : 'question',
					description : 'Задайте вопрос',
					type : 3,
					required : true,
				},
				{
					name : 'min',
					description : 'Минимально необходимое количество символов в ответе. (0 - ответ не обязателен)',
					type : 4,
					required : false,
				}
			]
		},
		{
			name : 'senate',
			description : 'Опрос среди модераторов',
			type : 1,
			options : [
				{
					name : 'question',
					description : 'Задайте вопрос',
					type : 3,
					required : true,
				},
				{
					name : 'min',
					description : 'Минимально необходтмое количество символов в ответе. (0 - ответ не обязателен)',
					type : 4,
					required : false,
				},
				{
					name : 'public',
					description : 'Если false, то опрос будет анонимным',
					type : 5,
					required : false
				},
			]
		},
		{
			name : 'show',
			description : 'Показать информацию о любом опросе',
			type : 1,
			options : [
				{
					name : 'search',
					description : 'Укажите любую информацию которая может быть связана с опросом',
					type : 3,
					required : true,
				}
			]
		},
	],

	init : function(){ return this; },

	/**
	 * @param {Object} int CommandInteraction
	 */
	slash : async function(int){
        const type = int.options.getSubcommand();
        if(type == 'common' || type == 'senate'){
            const question = int.options.data[0].options[0].value;
			const min = int.options.data[0].options[1]?.value ?? 25;
			const public = int.options.data[0].options[1]?.value ?? false;
            const txt = (type == 'common' ? 'Общий' : 'Закрытый');
			let flags = 0;
			flags += (type == 'common' ? 0 : this.FLAGS.POLLS.PRIVATE);
			flags += (public ? this.FLAGS.POLLS.PUBLIC : 0);
			if(min > 1000){
				await int.reply({content: 'Минимальное количество превышает максимальное'})
			} else {
            	const message = await int.reply({content: `${txt} опрос: ${question}`, components:
				[
					{
						type : 1, components: 
						[
							{
								type : 2,
								style: 3,
								customId:'poll|yes',
								label:'За'
							},
							{
								type : 2,
								style: 4,
								customId:'poll|no',
								label:'Против'
							},
							{
								type : 2,
								style: 2,
								customId:'poll|result',
								label:'Результаты'
							}
						]
					}
				],
					allowedMentions:{parse:[]},
					fetchReply: true
				})
				this.createPoll(message.id, question, min, 1000, flags);
			};
		} else {
			int.reply({content: 'В разработке', ephemeral: true});
		};
    },

	/**
	 * @param {Object} int ButtonInteraction
	 */
    button : async function(int){
        //int.reply({content: 'В разработке', ephemeral: true});
		const answer = this.getPollAnswer(int.member.user.id, int.message.id);
		const value = answer ? answer.answer : undefined;
		const poll = this.getPoll(int.message.id);
		if(!poll) return int.reply({content: 'Этот опрос не найден в базе данных', ephemeral: true});
		const resp = int.customId.split('|')[1]
		const private = poll.flags & this.FLAGS.POLLS.PRIVATE;
		if(private && (int.member.roles.cache.get('916999822693789718') || int.member.roles.cache.get('613412133715312641'))){
			return await int.reply({content: 'Отказано в достпуе', ephemeral: true})
		}

		const min = poll.min;

		if(resp == 'result') {
			await int.deferReply({ephemeral: true});
			const results = this.getPollResults(int.message.id);
			let content = 'Голосов пока нет';
			let votes = '';
			if(results.result.length){
				if(poll.flags & this.FLAGS.POLLS.PUBLIC){
					results.result.forEach(vote => {
						vote.answer = vote.answer.replace('\n', ' _ ')
						votes+= `${guild.members.cache.get(vote.user_id)?.displayName ?? vote.user_id}` + ((vote.flags & this.FLAGS.ANSWERS.DISAGREE) ? ' [0;41mПРОТИВ[0m ' : ' [0;45mЗА[0m ') +
						((vote.answer.length > 60) ? vote.answer.slice(0, 60) + '...' : vote.answer) + '\n';
					});
				};
				console.log(votes)
				content = 
				'```ansi\n' + 
				`против ${results.no} [[0;41m${' '.repeat(Math.round((results.no/results.result.length)*20))}[0;45m${' '.repeat(Math.round((results.yes/results.result.length)*20))}[0m] ${results.yes} за\n` + votes +
				'```';
			};
			try{
				return await int.editReply({content: content, ephemeral: true});
			} catch(e){
				console.log(e);
			}
		};

		await client.api.interactions(int.id, int.token).callback.post({
			data:{
				type: 9,
				data: {
					title: `${value ? 'Изменение' : 'Подтверждение'} голоса`,
					custom_id: 'poll|' + resp,
					components:[{
						type: 1,
						components:[{
							type: 4,
							custom_id: 'opininon',
							label: 'Почему вы выбрали именно \"' + ((resp == 'yes') ? 'За': 'Против') + '\"',
							style: 2,
							value: value,
							min_length: min,
							max_length: 1000,
							placeholder: 'Введите ваше ценное мнение',
							required: min != 0
						}]
					}],
				}
			}
		})
    },
	modal : async function(int){
		const type = int.data.custom_id.split('|')[1];
		let txt = ''
		console.log(`\x1b[33m${int.message.content} ${int.member.user.username} ${(type == 'yes') ? 'за' : 'против'}:\x1b[0m ${int.data.components[0].components[0].value}`)
		if(!this.getPollAnswer(int.member.user.id, int.message.id)){
			this.createPollAnswer(int.member.user.id, int.message.id, int.data.components[0].components[0].value, (type == 'yes') ? 0 : this.FLAGS.ANSWERS.DISAGREE)
			txt = 'подтверждён';
		} else {
			this.updatePollAnswer(int.member.user.id, int.message.id, int.data.components[0].components[0].value, (type == 'yes') ? 0 : this.FLAGS.ANSWERS.DISAGREE)
			txt = 'изменён';
		}
		await client.api.interactions(int.id, int.token).callback.post({
			data:{
				type: 4,
				data: {
					content: 'Голос ' + txt,
					flags: 64
				}
			}
		})
	},


	getPoll: function (message_id) {
		return DB.query(`SELECT * FROM polls WHERE id = '${message_id}';`)[0];
	},
	createPoll: function (message_id, question, min=0, max=0, flags=0) {
		return DB.query(`INSERT INTO polls VALUES ('${message_id}', '${question}', ${min}, ${max}, ${flags});`)[0];
	},

	getPollAnswer: function (user_id, message_id) {
		return DB.query(`SELECT * FROM poll_answers WHERE poll_id = '${message_id}' AND user_id = '${user_id}';`)[0];
	},
	getPollResults: function (message_id) {
		return {result: DB.query(`SELECT * FROM poll_answers WHERE poll_id = '${message_id}';`),
		yes: DB.query(`SELECT COUNT(*) FROM poll_answers WHERE poll_id = '${message_id}' AND flags = 0;`)[0]['COUNT(*)'],
		no: DB.query(`SELECT COUNT(*) FROM poll_answers WHERE poll_id = '${message_id}' AND flags = 1;`)[0]['COUNT(*)']};
	},
	createPollAnswer: function (user_id, message_id, answer='', flags=0) {
		return DB.query(`INSERT INTO poll_answers VALUES ('${user_id}', '${message_id}', '${answer}', ${flags});`)[0];
	},
	updatePollAnswer: function (user_id, message_id, answer='', flags=0) {
		return DB.query(`UPDATE poll_answers SET answer = '${answer}', flags = ${flags} WHERE poll_id = '${message_id}' AND user_id = '${user_id}';`)[0];
	},
};